import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Network, Users } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { getImagePath } from '@/utils/helpers';

interface Employee {
    id: number;
    name: string;
    avatar: string | null;
    designation: string;
    department: string;
    manager_id: number | null;
}

interface TreeNode extends Employee {
    children: TreeNode[];
}

// ─── Build tree ───────────────────────────────────────────────────
function buildTree(list: Employee[], managerId: number | null = null): TreeNode[] {
    return list
        .filter(e => e.manager_id == managerId)
        .map(e => ({ ...e, children: buildTree(list, e.id) }));
}

// ─── Single Node Card ─────────────────────────────────────────────
function NodeCard({ node, isRoot = false }: { node: TreeNode; isRoot?: boolean }) {
    const initials = node.name
        ? node.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <div
            style={{
                width: 160,
                background: 'var(--color-card, #fff)',
                border: isRoot
                    ? '2px solid var(--color-primary, #3b82f6)'
                    : '1.5px solid var(--color-border, #e5e7eb)',
                borderRadius: 14,
                boxShadow: isRoot
                    ? '0 4px 20px rgba(59,130,246,0.15)'
                    : '0 2px 10px rgba(0,0,0,0.07)',
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                padding: '16px 12px 12px',
                gap: 8,
                cursor: 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
                position: 'relative' as const,
            }}
            className="org-node-hover"
        >
            {/* Root badge */}
            {isRoot && (
                <div style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--color-primary, #3b82f6)',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: '2px 10px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    whiteSpace: 'nowrap' as const,
                }}>
                    Top Level
                </div>
            )}

            {/* Avatar */}
            <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: isRoot
                    ? 'var(--color-primary, #3b82f6)'
                    : 'color-mix(in srgb, var(--color-primary, #3b82f6) 12%, white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                border: `3px solid ${isRoot
                    ? 'rgba(255,255,255,0.3)'
                    : 'color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)'
                }`,
            }}>
                {node.avatar ? (
                    <img
                        src={getImagePath(node.avatar)}
                        alt={node.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{
                        fontWeight: 800,
                        fontSize: 18,
                        color: isRoot
                            ? '#fff'
                            : 'var(--color-primary, #3b82f6)',
                        fontFamily: 'Instrument Sans, system-ui, sans-serif',
                    }}>
                        {initials}
                    </span>
                )}
            </div>

            {/* Name */}
            <div style={{
                fontWeight: 700,
                fontSize: 12.5,
                color: 'var(--color-foreground, #111)',
                textAlign: 'center',
                lineHeight: 1.3,
                width: '100%',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                fontFamily: 'Instrument Sans, system-ui, sans-serif',
            }}>
                {node.name}
            </div>

            {/* Designation */}
            {node.designation && (
                <div style={{
                    fontSize: 10.5,
                    color: 'var(--color-muted-foreground, #6b7280)',
                    textAlign: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                    fontFamily: 'Instrument Sans, system-ui, sans-serif',
                }}>
                    {node.designation}
                </div>
            )}

            {/* Department chip */}
            {node.department && (
                <div style={{
                    background: 'color-mix(in srgb, var(--color-primary, #3b82f6) 10%, white)',
                    color: 'var(--color-primary, #3b82f6)',
                    fontSize: 9.5,
                    fontWeight: 600,
                    borderRadius: 20,
                    padding: '2px 10px',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                    fontFamily: 'Instrument Sans, system-ui, sans-serif',
                }}>
                    {node.department}
                </div>
            )}
        </div>
    );
}

// ─── Tree Node (card + children below) ───────────────────────────
const V_GAP = 56;   // gap between parent bottom and children top
const H_GAP = 24;   // gap between sibling cards

function OrgTreeNode({ node, isRoot = false }: { node: TreeNode; isRoot?: boolean }) {
    const hasChildren = node.children.length > 0;
    const LINE_COLOR = 'var(--color-border, #e2e8f0)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* ── Card ── */}
            <NodeCard node={node} isRoot={isRoot} />

            {/* ── Children connector + children ── */}
            {hasChildren && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                    {/* Vertical line down from card */}
                    <div style={{
                        width: 2,
                        height: V_GAP / 2,
                        background: LINE_COLOR,
                    }} />

                    {node.children.length === 1 ? (
                        // ── Single child: straight vertical line ──
                        <>
                            <div style={{ width: 2, height: V_GAP / 2, background: LINE_COLOR }} />
                            <OrgTreeNode node={node.children[0]} />
                        </>
                    ) : (
                        // ── Multiple children: horizontal rail ──
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                            {/* Horizontal rail across all children */}
                            <div
                                style={{
                                    height: 2,
                                    background: LINE_COLOR,
                                    alignSelf: 'stretch',
                                    marginInline: 80, // starts/ends at center of first/last card
                                }}
                            />
                            {/* Children row */}
                            <div style={{ display: 'flex', flexDirection: 'row', gap: H_GAP, alignItems: 'flex-start' }}>
                                {node.children.map((child, idx) => (
                                    <div
                                        key={child.id}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                                    >
                                        {/* Vertical drop to child card */}
                                        <div style={{ width: 2, height: V_GAP / 2, background: LINE_COLOR }} />
                                        <OrgTreeNode node={child} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Proper connector-based tree with CSS ─────────────────────────
function OrgTree({ node, isRoot = false }: { node: TreeNode; isRoot?: boolean }) {
    const hasChildren = node.children.length > 0;
    const CONNECTOR = 'var(--color-border, #d1d5db)';

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
            <NodeCard node={node} isRoot={isRoot} />

            {hasChildren && (
                <>
                    {/* ── Stem down from card ── */}
                    <div style={{ width: 2, height: 28, background: CONNECTOR }} />

                    {/* ── Children block ── */}
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                        {node.children.length === 1 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: 2, height: 28, background: CONNECTOR }} />
                                <OrgTree node={node.children[0]} />
                            </div>
                        ) : (
                            <div>
                                {/* Horizontal rail */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                    {/* The rail line */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 80,    // starts at center of leftmost child card
                                        right: 80,   // ends at center of rightmost child card
                                        height: 2,
                                        background: CONNECTOR,
                                    }} />

                                    {/* Children */}
                                    <div style={{ display: 'flex', gap: H_GAP, paddingTop: 0 }}>
                                        {node.children.map(child => (
                                            <div
                                                key={child.id}
                                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                            >
                                                <div style={{ width: 2, height: 28, background: CONNECTOR }} />
                                                <OrgTree node={child} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function OrgChart() {
    const { t } = useTranslation();
    const { employees } = usePage().props as any;
    const [zoom, setZoom] = useState(1);

    const containerRef = useRef<HTMLDivElement>(null);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0, sl: 0, st: 0 });

    const breadcrumbs = [
        { title: t('HR Management'), href: '#' },
        { title: t('Org. Chart'), href: route('hr.org-chart.index') },
    ];

    const empList: Employee[] = employees || [];
    const roots = buildTree(empList);

    // Pan
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;
        isPanning.current = true;
        panStart.current = {
            x: e.clientX, y: e.clientY,
            sl: containerRef.current.scrollLeft,
            st: containerRef.current.scrollTop,
        };
    }, []);
    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning.current || !containerRef.current) return;
        e.preventDefault();
        containerRef.current.scrollLeft = panStart.current.sl - (e.clientX - panStart.current.x);
        containerRef.current.scrollTop  = panStart.current.st  - (e.clientY - panStart.current.y);
    }, []);
    const stopPan = useCallback(() => { isPanning.current = false; }, []);

    // Wheel zoom
    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => parseFloat(Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)).toFixed(2)));
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Organizational Chart')} />

            {/* Hover style */}
            <style>{`
                .org-node-hover:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 28px rgba(0,0,0,0.13) !important;
                }
            `}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 120px)', minWidth: 0, minHeight: 0, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, paddingInline: 4 }}>
                    <Heading
                        title={t('Organizational Chart')}
                        description={t('Visual reporting structure of your organisation.')}
                        icon={Network}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border">
                            <Users className="h-3.5 w-3.5" />
                            {empList.length} {t('Employees')}
                        </div>

                        <div className="flex items-center bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r border-border"
                                onClick={() => setZoom(z => parseFloat(Math.max(0.3, z - 0.1).toFixed(2)))}
                                disabled={zoom <= 0.3}>
                                <ZoomOut className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-xs font-semibold tabular-nums w-12 text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-l border-r border-border"
                                onClick={() => setZoom(z => parseFloat(Math.min(2, z + 0.1).toFixed(2)))}
                                disabled={zoom >= 2}>
                                <ZoomIn className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none"
                                onClick={() => setZoom(1)} title={t('Reset zoom')}>
                                <Maximize2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 min-w-0 min-h-0 overflow-hidden rounded-xl border border-border relative z-0"
                    style={{ background: 'var(--color-muted, #f9fafb)' }}>

                    {/* Dot grid */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.5 }}>
                        <defs>
                            <pattern id="org-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                                <circle cx="1.5" cy="1.5" r="1.5" fill="var(--color-border, #d1d5db)" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#org-dots)" />
                    </svg>

                    {/* Scroll + pan */}
                    <div
                        ref={containerRef}
                        className="w-full h-full overflow-auto relative z-10"
                        style={{ cursor: 'grab' }}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={stopPan}
                        onMouseLeave={stopPan}
                        onWheel={onWheel}
                    >
                        {roots.length > 0 ? (
                            <div
                                style={{
                                    transformOrigin: 'top center',
                                    transform: `scale(${zoom})`,
                                    display: 'inline-flex',
                                    flexWrap: 'wrap',       // ← roots wrap to next row
                                    gap: 64,
                                    padding: 48,
                                    alignItems: 'flex-start',
                                    justifyContent: 'center',
                                    minWidth: '100%',
                                    transition: 'transform 0.15s ease',
                                }}
                            >
                                {roots.map(root => (
                                    <OrgTree key={root.id} node={root} isRoot />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                                <Network className="h-16 w-16 opacity-15" />
                                <p className="text-sm font-semibold">{t('No hierarchy found')}</p>
                                <p className="text-xs opacity-70">
                                    {t('Assign managers to employees to generate the org chart.')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
                        <div className="text-[10px] text-muted-foreground bg-card/90 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-sm">
                            {t('Drag to pan · Scroll or pinch to zoom')}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
