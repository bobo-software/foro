import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import ItemService from '@/services/itemService';
import StockItemBomService from '@/services/stockItemBomService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useItemStore } from '@/stores/data/ItemStore';
import type { CreateItemDto, Item, StockItemType } from '@/types/item';
import { itemFormWithBomSchema } from '@/validation/schemas';
import { wouldIntroduceBomCycle } from '@/utils/bomGraph';
import AppLabledAutocomplete from '@/components/forms/AppLabledAutocomplete';
import toast from 'react-hot-toast';

type BomRow = {
  key: string;
  component_item_id?: number;
  quantity_per: number;
  displayName: string;
};

const initial: CreateItemDto & { item_type: StockItemType } = {
  name: '',
  sku: '',
  description: '',
  unit_price: 0,
  cost_price: undefined,
  quantity: 0,
  tax_rate: undefined,
  item_type: 'single',
};

function newBomRow(): BomRow {
  return {
    key: crypto.randomUUID?.() ?? `bom-${Date.now()}-${Math.random()}`,
    quantity_per: 1,
    displayName: '',
  };
}

export function ItemFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const { items: stockItems, fetchItems } = useItemStore();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(initial);
  const [bomRows, setBomRows] = useState<BomRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const numericId = id ? Number(id) : undefined;

  useEffect(() => {
    fetchItems();
  }, [fetchItems, businessId]);

  const componentOptions = useMemo(() => {
    if (numericId == null) return stockItems;
    return stockItems.filter((i) => i.id !== numericId);
  }, [stockItems, numericId]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    ItemService.findById(Number(id))
      .then((item) => {
        if (!cancelled && item) {
          setForm({
            name: item.name,
            sku: item.sku ?? '',
            description: item.description ?? '',
            unit_price: item.unit_price ?? 0,
            cost_price: item.cost_price,
            quantity: item.quantity ?? 0,
            tax_rate: item.tax_rate,
            item_type: item.item_type === 'manufactured' ? 'manufactured' : 'single',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !numericId) return;
    let cancelled = false;
    StockItemBomService.findByParentId(numericId)
      .then((lines) => {
        if (cancelled) return;
        if (lines.length === 0) {
          setBomRows([]);
          return;
        }
        setBomRows(
          lines.map((l) => {
            const comp = stockItems.find((i) => i.id === l.component_item_id);
            return {
              key: `loaded-${l.id}-${l.component_item_id}`,
              component_item_id: l.component_item_id,
              quantity_per: Number(l.quantity_per),
              displayName: comp?.name ?? '',
            };
          }),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load bill of materials');
      });
    return () => {
      cancelled = true;
    };
  }, [id, numericId, stockItems]);

  const update = (key: keyof typeof form, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setItemType = (t: StockItemType) => {
    setForm((prev) => ({ ...prev, item_type: t }));
    if (t === 'single') {
      setBomRows([]);
    } else if (bomRows.length === 0) {
      setBomRows([newBomRow()]);
    }
  };

  const addBomRow = useCallback(() => {
    setBomRows((r) => [...r, newBomRow()]);
  }, []);

  const removeBomRow = useCallback((key: string) => {
    setBomRows((r) => r.filter((row) => row.key !== key));
  }, []);

  const updateBomRow = useCallback((key: string, patch: Partial<BomRow>) => {
    setBomRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  const onSelectComponent = useCallback(
    (rowKey: string) => (item: Item) => {
      updateBomRow(rowKey, {
        component_item_id: item.id,
        displayName: item.name,
      });
    },
    [updateBomRow],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const unitPrice = Number(form.unit_price);
    const quantity = form.quantity != null ? Number(form.quantity) : 0;

    const bom_lines =
      form.item_type === 'manufactured'
        ? bomRows
            .filter((r) => r.component_item_id != null && r.quantity_per > 0)
            .map((r) => ({
              component_item_id: r.component_item_id!,
              quantity_per: r.quantity_per,
            }))
        : [];

    const parsed = itemFormWithBomSchema.safeParse({
      name: form.name.trim(),
      sku: form.sku?.trim() || undefined,
      description: form.description?.trim() || undefined,
      unit_price: unitPrice,
      cost_price: form.cost_price != null ? Number(form.cost_price) : undefined,
      quantity: Number.isNaN(quantity) || quantity < 0 ? 0 : quantity,
      tax_rate: form.tax_rate != null ? Number(form.tax_rate) : undefined,
      item_type: form.item_type,
      bom_lines: form.item_type === 'manufactured' ? bom_lines : undefined,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? 'Invalid form');
      return;
    }

    if (form.item_type === 'manufactured') {
      const ids = bom_lines.map((l) => l.component_item_id);
      const dup = ids.find((x, i) => ids.indexOf(x) !== i);
      if (dup != null) {
        toast.error('Each component can only appear once in the bill of materials');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        ...(businessId != null && { business_id: businessId }),
        name: parsed.data.name,
        sku: parsed.data.sku,
        description: parsed.data.description,
        unit_price: parsed.data.unit_price,
        cost_price: parsed.data.cost_price,
        quantity: parsed.data.quantity ?? 0,
        tax_rate: parsed.data.tax_rate,
        item_type: parsed.data.item_type,
      };

      if (isEdit && id) {
        const itemId = Number(id);
        if (parsed.data.item_type === 'manufactured') {
          const allLines = await StockItemBomService.findAll({ limit: 20000 });
          const edges = allLines.map((l) => ({
            parent_item_id: l.parent_item_id,
            component_item_id: l.component_item_id,
          }));
          if (wouldIntroduceBomCycle(itemId, bom_lines.map((l) => l.component_item_id), edges)) {
            toast.error('This bill of materials would create a circular dependency');
            setSaving(false);
            return;
          }
        }

        await ItemService.update(itemId, payload);
        if (parsed.data.item_type === 'single') {
          await StockItemBomService.deleteByParentId(itemId);
        } else {
          await StockItemBomService.replaceForParent(itemId, bom_lines);
        }
        toast.success('Item updated');
        navigate(`/app/items/${id}`);
      } else {
        const created = await ItemService.create(payload);
        const newId = created.id;
        if (newId == null) {
          toast.error('Item was created but has no id; set bill of materials manually');
          navigate('/app/items');
          return;
        }
        if (parsed.data.item_type === 'manufactured') {
          const allLines = await StockItemBomService.findAll({ limit: 20000 });
          const edges = allLines.map((l) => ({
            parent_item_id: l.parent_item_id,
            component_item_id: l.component_item_id,
          }));
          if (wouldIntroduceBomCycle(newId, bom_lines.map((l) => l.component_item_id), edges)) {
            toast.error('This bill of materials would create a circular dependency');
            await ItemService.update(newId, { item_type: 'single' });
            await StockItemBomService.deleteByParentId(newId);
            setSaving(false);
            return;
          }
          await StockItemBomService.replaceForParent(newId, bom_lines);
        }
        toast.success('Item created');
        navigate(`/app/items/${newId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (isEdit ? 'Failed to update item' : 'Failed to create item'));
    } finally {
      setSaving(false);
    }
  };

  const hasNoBusiness = !isEdit && businessId == null;

  if (loading) {
    return <div className="text-slate-500">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'Edit item' : 'New item'}</h1>
        <Link
          to="/app/items"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 no-underline"
        >
          ← Back to stock
        </Link>
      </div>
      {hasNoBusiness && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Add your business first before creating items.{' '}
          <Link to="/onboard" className="font-medium text-amber-900 underline hover:no-underline">
            Add business
          </Link>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">Item type</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name="item_type"
                checked={form.item_type === 'single'}
                onChange={() => setItemType('single')}
                className="text-indigo-600"
              />
              Single — raw stock or simple SKU
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name="item_type"
                checked={form.item_type === 'manufactured'}
                onChange={() => setItemType('manufactured')}
                className="text-indigo-600"
              />
              Manufactured — made from other stock items
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">Name *</label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-slate-700">SKU</label>
          <input
            id="sku"
            type="text"
            value={form.sku ?? ''}
            onChange={(e) => update('sku', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantity</label>
          <input
            id="quantity"
            type="number"
            min={0}
            step={1}
            value={form.quantity ?? 0}
            onChange={(e) => update('quantity', e.target.value ? Number(e.target.value) : 0)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="unit_price" className="block text-sm font-medium text-slate-700">Selling price</label>
          <input
            id="unit_price"
            type="number"
            min={0}
            step="0.01"
            value={form.unit_price === 0 ? '' : form.unit_price}
            onChange={(e) => update('unit_price', e.target.value ? Number(e.target.value) : 0)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="cost_price" className="block text-sm font-medium text-slate-700">Cost price (optional)</label>
          <input
            id="cost_price"
            type="number"
            min={0}
            step="0.01"
            value={form.cost_price ?? ''}
            onChange={(e) => update('cost_price', e.target.value ? Number(e.target.value) : undefined)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="tax_rate" className="block text-sm font-medium text-slate-700">Tax rate (%)</label>
          <input
            id="tax_rate"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.tax_rate ?? ''}
            onChange={(e) => update('tax_rate', e.target.value ? Number(e.target.value) : undefined)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
          <textarea
            id="description"
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => update('description', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {form.item_type === 'manufactured' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-800/40">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bill of materials</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quantities are per one unit of this item.
                </p>
              </div>
              <button
                type="button"
                onClick={addBomRow}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                <LuPlus className="h-3.5 w-3.5" />
                Add line
              </button>
            </div>
            <div className="space-y-3">
              {bomRows.length === 0 && (
                <p className="text-sm text-slate-500">Add at least one component.</p>
              )}
              {bomRows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-end dark:border-slate-600 dark:bg-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <AppLabledAutocomplete
                      label="Component"
                      options={componentOptions}
                      value={row.component_item_id != null ? String(row.component_item_id) : ''}
                      displayValue={row.displayName}
                      accessor="name"
                      valueAccessor="id"
                      onSelect={onSelectComponent(row.key)}
                      onClear={() =>
                        updateBomRow(row.key, { component_item_id: undefined, displayName: '' })
                      }
                      placeholder="Search stock item…"
                      className="mb-0"
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Qty per unit
                    </label>
                    <input
                      type="number"
                      min={0.0001}
                      step="any"
                      value={row.quantity_per || ''}
                      onChange={(e) =>
                        updateBomRow(row.key, {
                          quantity_per: e.target.value ? Number(e.target.value) : 0,
                        })
                      }
                      className="block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBomRow(row.key)}
                    className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    aria-label="Remove line"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || hasNoBusiness}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Update item' : 'Create item'}
          </button>
          <Link
            to="/app/items"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 no-underline hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
