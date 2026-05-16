#!/usr/bin/env python3
"""
Generate backend architecture diagrams.

Requirements:
    pip install matplotlib networkx

Output:
    docs/images/module-graph.png  — NestJS module dependency graph
    docs/images/request-flow.png  — Request lifecycle (guards → controller → service → Prisma)
"""

import os
import sys

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    import networkx as nx
except ImportError:
    print("ERROR: Missing dependencies. Run: pip install matplotlib networkx", file=sys.stderr)
    sys.exit(1)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'docs', 'images')
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ─── Module Dependency Graph ────────────────────────────────────────────────

def generate_module_graph():
    """Directed graph: which modules depend on which shared modules."""

    # (source, target) — source imports target
    edges = [
        # All Phase 1 modules depend on PrismaModule
        ('CasesModule', 'PrismaModule'),
        ('ContactsModule', 'PrismaModule'),
        ('IntakeModule', 'PrismaModule'),
        ('TasksModule', 'PrismaModule'),
        ('DocumentsModule', 'PrismaModule'),
        ('PaymentsModule', 'PrismaModule'),
        ('ObituariesModule', 'PrismaModule'),
        ('SignaturesModule', 'PrismaModule'),
        ('FollowUpsModule', 'PrismaModule'),
        ('UsersModule', 'PrismaModule'),
        ('AuthModule', 'PrismaModule'),
        ('VendorsModule', 'PrismaModule'),
        ('SettingsModule', 'PrismaModule'),
        ('AnalyticsModule', 'PrismaModule'),
        ('PriceListModule', 'PrismaModule'),
        ('NotesModule', 'PrismaModule'),
        ('CalendarModule', 'PrismaModule'),
        ('CemeteryModule', 'PrismaModule'),
        ('MerchandiseModule', 'PrismaModule'),
        ('PreneedModule', 'PrismaModule'),
        ('FirstCallModule', 'PrismaModule'),
        ('TrackingModule', 'PrismaModule'),
        ('ReferralsModule', 'PrismaModule'),
        ('MemorialModule', 'PrismaModule'),
        ('FamilyPortalModule', 'PrismaModule'),

        # N8n integration
        ('IntakeModule', 'N8nModule'),
        ('CasesModule', 'N8nModule'),
        ('FollowUpsModule', 'N8nModule'),
        ('DocumentsModule', 'N8nModule'),

        # Email
        ('AuthModule', 'EmailModule'),
        ('FollowUpsModule', 'EmailModule'),

        # S3 / Documents
        ('DocumentsModule', 'S3Service'),
        ('DocumentsModule', 'PdfService'),

        # Cross-module
        ('IntakeModule', 'CasesModule'),
        ('IntakeModule', 'ContactsModule'),
        ('IntakeModule', 'TasksModule'),
        ('SignaturesModule', 'DocumentsModule'),
    ]

    # Node categories for colouring
    shared = {'PrismaModule', 'EmailModule', 'N8nModule', 'S3Service', 'PdfService'}
    phase2 = {'TrackingModule', 'ReferralsModule', 'MemorialModule', 'FamilyPortalModule'}

    G = nx.DiGraph()
    G.add_edges_from(edges)

    pos = nx.spring_layout(G, seed=42, k=2.5)

    color_map = []
    for node in G.nodes():
        if node in shared:
            color_map.append('#4A90E2')   # blue — shared infra
        elif node in phase2:
            color_map.append('#F5A623')   # orange — Phase 2
        elif 'Module' in node:
            color_map.append('#7ED321')   # green — Phase 1 business module
        else:
            color_map.append('#9B59B6')   # purple — services

    fig, ax = plt.subplots(figsize=(20, 14))
    nx.draw_networkx(
        G, pos, ax=ax,
        node_color=color_map,
        node_size=1800,
        font_size=7,
        font_weight='bold',
        arrows=True,
        arrowsize=15,
        edge_color='#cccccc',
        width=1.2,
    )

    legend_elements = [
        mpatches.Patch(facecolor='#4A90E2', label='Shared Infrastructure'),
        mpatches.Patch(facecolor='#7ED321', label='Phase 1 Business Module'),
        mpatches.Patch(facecolor='#F5A623', label='Phase 2 Stub'),
        mpatches.Patch(facecolor='#9B59B6', label='Service'),
    ]
    ax.legend(handles=legend_elements, loc='upper left', fontsize=9)
    ax.set_title('Kelova Backend — NestJS Module Dependency Graph', fontsize=14, fontweight='bold', pad=20)
    ax.axis('off')
    fig.tight_layout()

    out = os.path.join(OUTPUT_DIR, 'module-graph.png')
    fig.savefig(out, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"  ✓ {out}")


# ─── Request Lifecycle Diagram ───────────────────────────────────────────────

def generate_request_flow():
    """Horizontal flowchart of a request through the NestJS middleware stack."""

    stages = [
        ('HTTP Request', '#E8E8E8'),
        ('Throttle\nGuard', '#F5A623'),
        ('Cognito\nAuth Guard', '#4A90E2'),
        ('Roles\nGuard', '#4A90E2'),
        ('Controller', '#7ED321'),
        ('Service', '#7ED321'),
        ('Prisma\n(forTenant)', '#9B59B6'),
        ('PostgreSQL', '#E74C3C'),
    ]

    interceptors = ['AuditLog\nInterceptor', 'HTTP\nException\nFilter']

    fig, ax = plt.subplots(figsize=(18, 6))
    ax.set_xlim(0, len(stages) + 1)
    ax.set_ylim(-2, 3)
    ax.axis('off')

    box_w, box_h = 1.2, 0.8
    gap = 0.3

    for i, (label, color) in enumerate(stages):
        x = i * (box_w + gap) + 0.5
        rect = mpatches.FancyBboxPatch(
            (x, 0.6), box_w, box_h,
            boxstyle='round,pad=0.1',
            facecolor=color, edgecolor='#555555', linewidth=1.2,
        )
        ax.add_patch(rect)
        ax.text(x + box_w / 2, 0.6 + box_h / 2, label,
                ha='center', va='center', fontsize=8, fontweight='bold', wrap=True)

        if i < len(stages) - 1:
            arrow_x = x + box_w + 0.02
            ax.annotate('', xy=(arrow_x + gap - 0.02, 1.0), xytext=(arrow_x, 1.0),
                        arrowprops=dict(arrowstyle='->', color='#555555', lw=1.5))

    # Interceptor band
    total_width = len(stages) * (box_w + gap) - gap + 0.2
    rect2 = mpatches.FancyBboxPatch(
        (0.4, 1.6), total_width, 0.5,
        boxstyle='round,pad=0.05',
        facecolor='#D5E8D4', edgecolor='#82B366', linewidth=1.2, linestyle='--',
        alpha=0.7,
    )
    ax.add_patch(rect2)
    ax.text(0.4 + total_width / 2, 1.85, 'AuditLogInterceptor (wraps all routes)',
            ha='center', va='center', fontsize=9, color='#3D6B47')

    rect3 = mpatches.FancyBboxPatch(
        (0.4, -0.8), total_width, 0.5,
        boxstyle='round,pad=0.05',
        facecolor='#FFE6CC', edgecolor='#D6B656', linewidth=1.2, linestyle='--',
        alpha=0.7,
    )
    ax.add_patch(rect3)
    ax.text(0.4 + total_width / 2, -0.55, 'HttpExceptionFilter (catches all errors)',
            ha='center', va='center', fontsize=9, color='#7A5C00')

    ax.set_title('Kelova Backend — Request Lifecycle', fontsize=13, fontweight='bold', pad=12)
    fig.tight_layout()

    out = os.path.join(OUTPUT_DIR, 'request-flow.png')
    fig.savefig(out, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"  ✓ {out}")


if __name__ == '__main__':
    print("Generating backend diagrams...")
    generate_module_graph()
    generate_request_flow()
    print("Done.")
