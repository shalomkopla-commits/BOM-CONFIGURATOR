'use client';

import React from 'react';
import { BomRow, CatalogRule, Order, SystemType } from '@/types/configurator';
import { getItemImageUrl } from '@/data/initialData';

interface VisualProductTreeProps {
  order: Order;
  bomRows: BomRow[];
  systemTypes: SystemType[];
  catalogRules: CatalogRule[];
  onOpenCustomModal?: (rowId: string) => void;
}

export default function VisualProductTree({
  order,
  bomRows,
  systemTypes,
  catalogRules,
  onOpenCustomModal,
}: VisualProductTreeProps) {
  const sysObj = systemTypes.find((s) => s.id === order.systemTypeId);
  const sysImageUrl = getItemImageUrl(
    order.systemTypeId,
    sysObj?.customImg,
    false
  );

  const hasCustom = bomRows.some((b) => b.isCustom && !b.removed);

  // Group top-level assemblies by category
  const categoriesMap = new Map<string, BomRow[]>();
  bomRows
    .filter((b) => b.level === 'assembly')
    .forEach((asm) => {
      if (!categoriesMap.has(asm.category)) {
        categoriesMap.set(asm.category, []);
      }
      categoriesMap.get(asm.category)!.push(asm);
    });

  const resolveRowImg = (item: BomRow): string => {
    if (item.isCustom) {
      return getItemImageUrl('CUSTOM-DEV', null, true);
    }
    const rule = catalogRules.find((r) => r.sku === item.sku);
    return getItemImageUrl(
      item.sku,
      item.customImg || rule?.customImg,
      item.isCustom
    );
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 overflow-x-auto">
      <div className="org-tree min-w-[960px]">
        <ul>
          <li>
            {/* Root Node: System */}
            <div
              className={`inline-block bg-slate-900 text-white rounded-2xl p-4 shadow-xl border-2 ${
                hasCustom ? 'border-orange-500' : 'border-blue-500'
              } w-80 text-right relative`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider bg-blue-600/30 text-blue-200 px-2 py-0.5 rounded font-mono">
                  ROOT SYSTEM • {order.systemTypeId}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    hasCustom
                      ? 'bg-orange-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div className="bg-slate-800 rounded-xl p-2 mb-2.5 flex justify-center border border-slate-700 overflow-hidden">
                <img
                  src={sysImageUrl}
                  alt={order.systemName}
                  className="w-52 h-32 object-cover rounded-lg"
                />
              </div>
              <div className="font-bold text-sm mb-0.5">{order.systemName}</div>
              <div className="text-[11px] text-slate-300">
                הזמנה: <strong className="font-mono">{order.id}</strong> |{' '}
                {order.customer}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-700 flex flex-wrap justify-between gap-1 text-[11px] text-slate-300">
                <span>⚡ {order.power}</span>
                <span>🔭 {order.focal}</span>
                <span>🔌 {order.voltage}</span>
                <span>🏷️ {order.usage || 'אזרחי'}</span>
              </div>
            </div>

            {/* Category Branches */}
            {categoriesMap.size > 0 && (
              <ul>
                {Array.from(categoriesMap.entries()).map(([catName, asms]) => {
                  const catHasCustom = asms.some(
                    (a) =>
                      (a.isCustom && !a.removed) ||
                      bomRows.some(
                        (s) => s.parentId === a.id && s.isCustom && !s.removed
                      )
                  );
                  return (
                    <li key={catName}>
                      <div
                        className={`inline-block px-4 py-2 rounded-xl font-bold text-xs shadow-sm border-2 ${
                          catHasCustom
                            ? 'bg-orange-50 border-orange-400 text-orange-900'
                            : 'bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                      >
                        📁 קטגוריה: {catName}
                      </div>

                      {/* Assemblies under Category */}
                      <ul>
                        {asms.map((asm) => {
                          const subs = bomRows.filter(
                            (b) =>
                              b.level === 'sub-assembly' &&
                              b.parentId === asm.id
                          );
                          const asmCardStyle = asm.removed
                            ? 'bg-red-50/70 border-2 border-red-300 opacity-75'
                            : asm.isCustom
                            ? 'bg-orange-50 border-2 border-orange-500 ring-4 ring-orange-500/15'
                            : 'bg-white border-2 border-slate-300';

                          return (
                            <li key={asm.id}>
                              <div
                                className={`inline-block w-64 rounded-xl p-3 text-right shadow-md transition hover:shadow-lg ${asmCardStyle}`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span
                                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                      asm.removed
                                        ? 'bg-red-200 text-red-900 line-through'
                                        : asm.isCustom
                                        ? 'bg-orange-200 text-orange-950'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {asm.sku}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    כמות: {asm.qty}
                                  </span>
                                </div>

                                <div
                                  className={`rounded-lg p-1.5 mb-2 flex justify-center border overflow-hidden ${
                                    asm.isCustom
                                      ? 'bg-orange-100/70 border-orange-300'
                                      : 'bg-slate-900 border-slate-200'
                                  }`}
                                >
                                  <img
                                    src={resolveRowImg(asm)}
                                    alt={asm.desc}
                                    className="w-48 h-28 object-cover rounded"
                                  />
                                </div>

                                <div
                                  className={`font-bold text-xs mb-1 ${
                                    asm.removed
                                      ? 'text-red-900 line-through'
                                      : asm.isCustom
                                      ? 'text-orange-950'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {asm.desc}
                                </div>
                                <div className="text-[11px] text-slate-500 mb-1.5">
                                  מהדורה: <strong>{asm.rev}</strong>
                                </div>

                                <div className="text-[10px]">
                                  {asm.removed ? (
                                    <span className="inline-block bg-red-600 text-white px-2 py-0.5 rounded font-bold">
                                      🚫 הוסר ע&quot;י רכש
                                    </span>
                                  ) : asm.isCustom ? (
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="inline-block bg-orange-500 text-white px-2 py-0.5 rounded font-bold">
                                        ⚠️ דרישת פיתוח
                                      </span>
                                      {onOpenCustomModal && !order.locked && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onOpenCustomModal(asm.id)
                                          }
                                          className="text-[10px] bg-orange-700 hover:bg-orange-800 text-white px-1.5 py-0.5 rounded font-bold"
                                        >
                                          בחר מכלול
                                        </button>
                                      )}
                                    </div>
                                  ) : asm.rowLocked ? (
                                    <span className="inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                                      🔒 מכלול נעול ומאושר
                                    </span>
                                  ) : (
                                    <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                                      🔓 לבחירת רכש (לא נעול)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Sub-assemblies */}
                              {subs.length > 0 && (
                                <ul>
                                  {subs.map((sub) => {
                                    const subCardStyle = sub.removed
                                      ? 'bg-red-50/70 border-2 border-red-300 opacity-75'
                                      : sub.isCustom
                                      ? 'bg-orange-50 border-2 border-orange-500 ring-4 ring-orange-500/15'
                                      : 'bg-white border-2 border-blue-200';

                                    return (
                                      <li key={sub.id}>
                                        <div
                                          className={`inline-block w-56 rounded-xl p-2.5 text-right shadow-sm transition hover:shadow-md ${subCardStyle}`}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <span
                                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                                sub.removed
                                                  ? 'bg-red-200 text-red-900 line-through'
                                                  : sub.isCustom
                                                  ? 'bg-orange-200 text-orange-950'
                                                  : 'bg-blue-50 text-blue-700'
                                              }`}
                                            >
                                              {sub.sku}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                              כמות: {sub.qty}
                                            </span>
                                          </div>

                                          <div
                                            className={`rounded-lg p-1 mb-1.5 flex justify-center border overflow-hidden ${
                                              sub.isCustom
                                                ? 'bg-orange-100/70 border-orange-300'
                                                : 'bg-slate-900 border-slate-100'
                                            }`}
                                          >
                                            <img
                                              src={resolveRowImg(sub)}
                                              alt={sub.desc}
                                              className="w-40 h-24 object-cover rounded"
                                            />
                                          </div>

                                          <div
                                            className={`font-bold text-[11px] mb-0.5 ${
                                              sub.removed
                                                ? 'text-red-900 line-through'
                                                : sub.isCustom
                                                ? 'text-orange-950'
                                                : 'text-slate-800'
                                            }`}
                                          >
                                            {sub.desc}
                                          </div>
                                          <div className="text-[10px] text-slate-500 mb-1">
                                            תת-מכלול | {sub.rev}
                                          </div>

                                          <div className="text-[10px]">
                                            {sub.removed ? (
                                              <span className="inline-block bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">
                                                🚫 הוסר
                                              </span>
                                            ) : sub.isCustom ? (
                                              <div className="flex items-center justify-between gap-1">
                                                <span className="inline-block bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">
                                                  ⚠️ פיתוח Custom
                                                </span>
                                                {onOpenCustomModal &&
                                                  !order.locked && (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        onOpenCustomModal(
                                                          sub.id
                                                        )
                                                      }
                                                      className="text-[10px] bg-orange-700 hover:bg-orange-800 text-white px-1.5 py-0.5 rounded font-bold"
                                                    >
                                                      בחר
                                                    </button>
                                                  )}
                                              </div>
                                            ) : (
                                              <span className="inline-block bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                                                ✓ תת-מכלול תואם
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}

