import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuPlus, LuTrash2, LuPackage, LuLayers, LuInfo } from 'react-icons/lu';
import ItemService from '@/services/itemService';
import StockItemBomService from '@/services/stockItemBomService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useItemStore } from '@/stores/data/ItemStore';
import type { CreateItemDto, Item, StockItemType } from '@/types/item';
import { itemFormWithBomSchema } from '@/validation/schemas';
import { wouldIntroduceBomCycle } from '@/utils/bomGraph';
import AppLabledAutocomplete from '@/components/forms/AppLabledAutocomplete';
import AppText from '@/components/text/AppText';
import { formatCurrency } from '@/utils/currency';
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

const INPUT_CLS =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none';

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

  useEffect(() => { fetchItems(); }, [fetchItems, businessId]);

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
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!id || !numericId) return;
    let cancelled = false;
    StockItemBomService.findByParentId(numericId)
      .then((lines) => {
        if (cancelled) return;
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
      .catch(() => { if (!cancelled) toast.error('Failed to load bill of materials'); });
    return () => { cancelled = true; };
  }, [id, numericId, stockItems]);

  const update = (key: keyof typeof form, value: string | number | undefined) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setItemType = (t: StockItemType) => {
    setForm((prev) => ({ ...prev, item_type: t }));
    if (t === 'single') setBomRows([]);
    else if (bomRows.length === 0) setBomRows([newBomRow()]);
  };

  const addBomRow = useCallback(() => setBomRows((r) => [...r, newBomRow()]), []);
  const removeBomRow = useCallback((key: string) =>
    setBomRows((r) => r.filter((row) => row.key !== key)), []);
  const updateBomRow = useCallback((key: string, patch: Partial<BomRow>) =>
    setBomRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row))), []);

  const onSelectComponent = useCallback(
    (rowKey: string) => (item: Item) =>
      updateBomRow(rowKey, { component_item_id: item.id, displayName: item.name }),
    [updateBomRow],
  );

  // Live BOM cost breakdown
  const bomCostLines = useMemo(() =>
    bomRows
      .filter((r) => r.component_item_id != null)
      .map((r) => {
        const item = stockItems.find((i) => i.id === r.component_item_id);
        const unitCost = item?.cost_price != null ? Number(item.cost_price) : null;
        return {
          key: r.key,
          name: r.displayName || 'Unknown',
          qty: r.quantity_per,
          unitCost,
          lineTotal: unitCost != null ? unitCost * r.quantity_per : null,
        };
      }),
    [bomRows, stockItems],
  );

  const bomTotalCost = useMemo(() =>
    bomCostLines.every((l) => l.lineTotal != null)
      ? bomCostLines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0)
      : null,
    [bomCostLines],
  );

  const hasPartialCosts = bomCostLines.length > 0 && bomCostLines.some((l) => l.lineTotal == null);

  // How many finished units can be manufactured from current component stock
  const bomManufacturable = useMemo(() => {
    const activeRows = bomRows.filter((r) => r.component_item_id != null && r.quantity_per > 0);
    if (activeRows.length === 0) return null;
    const limits = activeRows.map((r) => {
      const item = stockItems.find((i) => i.id === r.component_item_id);
      const stock = item?.quantity != null ? Number(item.quantity) : 0;
      return Math.floor(stock / r.quantity_per);
    });
    return Math.min(...limits);
  }, [bomRows, stockItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const unitPrice = Number(form.unit_price);
    const quantity = form.quantity != null ? Number(form.quantity) : 0;

    const bom_lines =
      form.item_type === 'manufactured'
        ? bomRows
            .filter((r) => r.component_item_id != null && r.quantity_per > 0)
            .map((r) => ({ component_item_id: r.component_item_id!, quantity_per: r.quantity_per }))
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
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid form');
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
          const edges = allLines.map((l) => ({ parent_item_id: l.parent_item_id, component_item_id: l.component_item_id }));
          if (wouldIntroduceBomCycle(itemId, bom_lines.map((l) => l.component_item_id), edges)) {
            toast.error('This bill of materials would create a circular dependency');
            setSaving(false);
            return;
          }
        }
        await ItemService.update(itemId, payload);
        await StockItemBomService.replaceForParent(
          itemId,
          parsed.data.item_type === 'manufactured' ? bom_lines : [],
        );
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
          const edges = allLines.map((l) => ({ parent_item_id: l.parent_item_id, component_item_id: l.component_item_id }));
          if (wouldIntroduceBomCycle(newId, bom_lines.map((l) => l.component_item_id), edges)) {
            toast.error('This bill of materials would create a circular dependency');
            await ItemService.update(newId, { item_type: 'single' });
            await StockItemBomService.replaceForParent(newId, []);
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

  if (loading) return <AppText variant="caption">Loading…</AppText>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <AppText variant="h1">{isEdit ? 'Edit stock item' : 'New item'}</AppText>
        <Link to="/app/items" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 no-underline">
          ← Back to stock
        </Link>
      </div>

      {/* No-business warning */}
      {hasNoBusiness && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Add your business first before creating items.{' '}
          <Link to="/onboard" className="font-medium text-amber-900 underline hover:no-underline">
            Add business
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

        {/* Item type */}
        <div className="space-y-2">
          <AppText variant="label">Item type</AppText>
          <div className="grid grid-cols-2 gap-3 sm:max-w-lg">
            {([
              { value: 'single' as const, Icon: LuPackage, title: 'Single', desc: 'Raw stock or simple SKU' },
              { value: 'manufactured' as const, Icon: LuLayers, title: 'Manufactured', desc: 'Made from other stock items' },
            ]).map(({ value, Icon, title, desc }) => {
              const active = form.item_type === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setItemType(value)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{title}</p>
                    <AppText variant="caption">{desc}</AppText>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Identity */}
        <div className={`grid gap-4 ${form.item_type === 'manufactured' ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-600">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-slate-600">SKU</label>
            <input
              id="sku"
              type="text"
              value={form.sku ?? ''}
              onChange={(e) => update('sku', e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          {form.item_type === 'single' && (
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-slate-600">Stock quantity</label>
              <input
                id="quantity"
                type="number"
                min={0}
                step={1}
                value={form.quantity ?? 0}
                onChange={(e) => update('quantity', e.target.value ? Number(e.target.value) : 0)}
                className={INPUT_CLS}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-600">Description</label>
          <textarea
            id="description"
            rows={2}
            value={form.description ?? ''}
            onChange={(e) => update('description', e.target.value)}
            className={INPUT_CLS}
          />
        </div>

        <div className="h-px bg-slate-100" />

        {/* Pricing */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="unit_price" className="block text-sm font-medium text-slate-600">Selling price</label>
            <input
              id="unit_price"
              type="number"
              min={0}
              step="0.01"
              value={form.unit_price === 0 ? '' : form.unit_price}
              onChange={(e) => update('unit_price', e.target.value ? Number(e.target.value) : 0)}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label htmlFor="cost_price" className="block text-sm font-medium text-slate-600">Cost price (per item / unit)</label>
            <input
              id="cost_price"
              type="number"
              min={0}
              step="0.01"
              value={form.cost_price ?? ''}
              onChange={(e) => update('cost_price', e.target.value ? Number(e.target.value) : undefined)}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label htmlFor="tax_rate" className="block text-sm font-medium text-slate-600">Tax rate (%)</label>
            <input
              id="tax_rate"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.tax_rate ?? ''}
              onChange={(e) => update('tax_rate', e.target.value ? Number(e.target.value) : undefined)}
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* Bill of materials */}
        {form.item_type === 'manufactured' && (
          <>
            <div className="h-px bg-slate-100" />
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <AppText variant="h3">Bill of materials</AppText>
                  <AppText variant="caption">Quantities per one finished unit</AppText>
                </div>
                <div className="flex items-center gap-3">
                  {bomManufacturable != null && (
                    <div className={`rounded-lg border px-3 py-1.5 text-center ${
                      bomManufacturable === 0
                        ? 'border-red-200 bg-red-50'
                        : 'border-emerald-200 bg-emerald-50'
                    }`}>
                      <p className={`text-lg font-bold leading-none ${bomManufacturable === 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {bomManufacturable}
                      </p>
                      <p className={`mt-0.5 text-xs ${bomManufacturable === 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        can make
                      </p>
                    </div>
                  )}
                  <button
                  type="button"
                  onClick={addBomRow}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LuPlus className="h-3.5 w-3.5" />
                  Add line
                </button>
                </div>
              </div>

              {/* BOM rows */}
              {bomRows.length === 0 && (
                <AppText variant="caption">Add at least one component.</AppText>
              )}
              {bomRows.map((row) => (
                <div
                  key={row.key}
                  className="grid items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                  style={{ gridTemplateColumns: '1fr 140px 36px' }}
                >
                  <AppLabledAutocomplete
                    label="Component"
                    options={componentOptions}
                    value={row.component_item_id != null ? String(row.component_item_id) : ''}
                    displayValue={row.displayName}
                    accessor="name"
                    valueAccessor="id"
                    onSelect={onSelectComponent(row.key)}
                    onClear={() => updateBomRow(row.key, { component_item_id: undefined, displayName: '' })}
                    placeholder="Search stock item…"
                    className="mb-0"
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Qty / unit</label>
                    <input
                      type="number"
                      min={0.0001}
                      step="any"
                      value={row.quantity_per || ''}
                      onChange={(e) =>
                        updateBomRow(row.key, { quantity_per: e.target.value ? Number(e.target.value) : 0 })
                      }
                      className={INPUT_CLS}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBomRow(row.key)}
                    aria-label="Remove line"
                    className="self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Cost breakdown */}
              {bomCostLines.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white">
                  {/* Header row */}
                  <div className="grid grid-cols-4 gap-3 border-b border-slate-100 px-4 py-2">
                    <span className="col-span-2 text-xs font-medium text-slate-400">Component</span>
                    <span className="text-right text-xs font-medium text-slate-400">Unit cost</span>
                    <span className="text-right text-xs font-medium text-slate-400">Line total</span>
                  </div>

                  {/* Lines */}
                  {bomCostLines.map((line) => (
                    <div key={line.key} className="grid grid-cols-4 gap-3 px-4 py-2">
                      <span className="col-span-2 truncate text-sm text-slate-700">{line.name}</span>
                      <span className="text-right text-sm text-slate-500">
                        {line.unitCost != null ? formatCurrency(line.unitCost) : '—'}
                        {line.unitCost != null && (
                          <span className="ml-1 text-xs text-slate-400">× {line.qty}</span>
                        )}
                      </span>
                      <span className={`text-right text-sm font-medium ${line.lineTotal != null ? 'text-slate-800' : 'text-slate-400'}`}>
                        {line.lineTotal != null ? formatCurrency(line.lineTotal) : '—'}
                      </span>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 rounded-b-lg">
                    <div className="flex items-center gap-1.5">
                      <AppText variant="label" className="text-slate-700!">Est. materials cost per unit</AppText>
                      {hasPartialCosts && (
                        <span title="Some components are missing a cost price">
                          <LuInfo className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                    </div>
                    <span className="text-base font-semibold text-slate-800">
                      {bomTotalCost != null ? formatCurrency(bomTotalCost) : '—'}
                    </span>
                  </div>
                </div>
              )}

              {/* Margin hint */}
              {bomTotalCost != null && form.unit_price > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                  <div className="flex-1">
                    <AppText variant="caption">
                      Selling price{' '}
                      <span className="font-medium text-slate-700">{formatCurrency(Number(form.unit_price))}</span>
                      {' '}— materials cost{' '}
                      <span className="font-medium text-slate-700">{formatCurrency(bomTotalCost)}</span>
                    </AppText>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const margin = Number(form.unit_price) - bomTotalCost;
                      const pct = Number(form.unit_price) > 0 ? (margin / Number(form.unit_price)) * 100 : 0;
                      const isPositive = margin >= 0;
                      return (
                        <div>
                          <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{formatCurrency(margin)}
                          </p>
                          <p className={`text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                            {pct.toFixed(1)}% margin
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={saving || hasNoBusiness}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Update item' : 'Create item'}
          </button>
          <Link
            to="/app/items"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 no-underline hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
