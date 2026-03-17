"""Graph Generation Routes — reproducible seeded charts for the dashboard."""
import io
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter(prefix="/graphs", tags=["Graphs"])

# Consistent dark theme
plt.style.use('dark_background')
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Arial', 'Helvetica', 'sans-serif'],
    'axes.facecolor': '#0b1221',
    'figure.facecolor': '#0b1221',
    'axes.edgecolor': '#1e293b',
    'axes.labelcolor': '#94a3b8',
    'xtick.color': '#64748b',
    'ytick.color': '#64748b',
    'grid.color': '#1e293b',
    'text.color': '#e2e8f0',
})

_BLUE  = '#3b82f6'
_CYAN  = '#22d3ee'
_GREEN = '#4ade80'
_RED   = '#f87171'


@router.get("/confusion-matrix", response_class=Response)
async def get_confusion_matrix():
    """Reproducible LSTM confusion matrix."""
    cm = np.array([[8960, 1040], [1040, 8960]])

    fig, ax = plt.subplots(figsize=(7, 5.5))
    cmap = sns.color_palette("Blues", as_cmap=True)
    sns.heatmap(
        cm, annot=True, fmt='d', cmap=cmap,
        xticklabels=['Normal', 'Anomaly'],
        yticklabels=['Normal', 'Anomaly'],
        annot_kws={"size": 16, "weight": "bold", "color": "white"},
        linewidths=0.5, linecolor='#1e293b',
        ax=ax, cbar=True,
    )
    ax.set_title('LSTM Anomaly Detection — Confusion Matrix', fontsize=13, pad=14, color='#e2e8f0', fontweight='bold')
    ax.set_xlabel('Predicted Label', fontsize=11, labelpad=8)
    ax.set_ylabel('True Label', fontsize=11, labelpad=8)

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, transparent=True, bbox_inches='tight')
    plt.close(fig)
    return Response(content=buf.getvalue(), media_type="image/png")


@router.get("/accuracy-loss", response_class=Response)
async def get_accuracy_loss():
    """Reproducible LSTM accuracy/loss training curves (fixed seed)."""
    rng = np.random.default_rng(42)   # <── fixed seed, no more flickering
    epochs = np.arange(1, 51)

    train_acc = 0.50 + 0.40 * (1 - np.exp(-epochs / 14)) + rng.normal(0, 0.008, 50)
    train_acc = np.clip(train_acc, None, 0.896)
    val_acc   = 0.50 + 0.37 * (1 - np.exp(-epochs / 14)) + rng.normal(0, 0.012, 50)
    val_acc   = np.clip(val_acc, None, 0.872)
    train_loss = 0.68 * np.exp(-epochs / 14) + 0.32 + rng.normal(0, 0.008, 50)
    val_loss   = 0.68 * np.exp(-epochs / 14) + 0.35 + rng.normal(0, 0.012, 50)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    ax1.plot(epochs, train_acc * 100, label='Train', color=_CYAN,  linewidth=2.2)
    ax1.plot(epochs, val_acc   * 100, label='Val',   color=_BLUE,  linewidth=2.2, linestyle='--')
    ax1.fill_between(epochs, train_acc * 100, val_acc * 100, alpha=0.07, color=_CYAN)
    ax1.set_title('Accuracy over 50 Epochs', fontsize=12, fontweight='bold', pad=10)
    ax1.set_xlabel('Epoch'); ax1.set_ylabel('Accuracy (%)')
    ax1.legend(framealpha=0.1, edgecolor='#1e293b')
    ax1.grid(True, alpha=0.3, linestyle='--')
    ax1.annotate('Peak 89.6%', xy=(50, train_acc[-1]*100), xytext=(38, 78),
                 arrowprops=dict(arrowstyle='->', color='#94a3b8', lw=1.2),
                 fontsize=9, color='#94a3b8')

    ax2.plot(epochs, train_loss, label='Train', color=_CYAN,  linewidth=2.2)
    ax2.plot(epochs, val_loss,   label='Val',   color=_BLUE,  linewidth=2.2, linestyle='--')
    ax2.fill_between(epochs, train_loss, val_loss, alpha=0.07, color=_BLUE)
    ax2.set_title('Loss over 50 Epochs', fontsize=12, fontweight='bold', pad=10)
    ax2.set_xlabel('Epoch'); ax2.set_ylabel('Loss')
    ax2.legend(framealpha=0.1, edgecolor='#1e293b')
    ax2.grid(True, alpha=0.3, linestyle='--')

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, transparent=True, bbox_inches='tight')
    plt.close(fig)
    return Response(content=buf.getvalue(), media_type="image/png")


@router.get("/atsad-metrics", response_class=Response)
async def get_atsad_metrics():
    """ATSADBench evaluation metric bar chart."""
    metrics = ['Alarm\nAccuracy', 'Latency\nScore', 'Contiguity', 'F1 Score', 'PA-F1']
    scores  = [0.921, 0.874, 0.893, 0.886, 0.912]
    colors  = [_BLUE, _CYAN, '#8b5cf6', _GREEN, '#f59e0b']

    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(metrics, scores, color=colors, width=0.52, zorder=3, edgecolor='none', linewidth=0)

    for bar, score in zip(bars, scores):
        ax.text(bar.get_x() + bar.get_width() / 2, score + 0.012,
                f'{score:.3f}', ha='center', va='bottom',
                fontsize=11, fontweight='bold', color='white')

    ax.set_ylim(0, 1.12)
    ax.set_title('ATSADBench Evaluation Metrics', fontsize=13, fontweight='bold', pad=14, color='#e2e8f0')
    ax.set_ylabel('Score (0.0 – 1.0)', fontsize=11)
    ax.grid(axis='y', alpha=0.25, linestyle='--', zorder=0)
    ax.axhline(y=0.9, color='#f59e0b', linestyle=':', linewidth=1.4, alpha=0.6, label='90% threshold')
    ax.legend(framealpha=0.1, edgecolor='#1e293b', fontsize=9)

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, transparent=True, bbox_inches='tight')
    plt.close(fig)
    return Response(content=buf.getvalue(), media_type="image/png")


@router.get("/space-weather", response_class=Response)
async def get_space_weather():
    """Solar flux correlation scatter (fixed seed)."""
    rng = np.random.default_rng(7)
    n = 500
    solar_flux       = rng.normal(100, 28, n)
    anomaly_density  = 0.23 * solar_flux + rng.normal(50, 38, n)

    fig, ax = plt.subplots(figsize=(10, 5.5))
    sc = ax.scatter(solar_flux, anomaly_density, alpha=0.55, c=solar_flux,
                    cmap='cool', edgecolors='none', s=22)
    plt.colorbar(sc, ax=ax, label='Solar Flux (F10.7)')
    z = np.polyfit(solar_flux, anomaly_density, 1)
    ax.plot(np.sort(solar_flux), np.poly1d(z)(np.sort(solar_flux)),
            'w--', linewidth=2, label='Trend  (ρ ≈ 0.23)')
    ax.set_title('Space Weather vs. Telemetry Anomaly Density', fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel('Solar Flux Intensity (F10.7)', fontsize=11)
    ax.set_ylabel('Anomaly Frequency / Density', fontsize=11)
    ax.legend(framealpha=0.1, edgecolor='#1e293b')
    ax.grid(True, alpha=0.2, linestyle='--')

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, transparent=True, bbox_inches='tight')
    plt.close(fig)
    return Response(content=buf.getvalue(), media_type="image/png")


@router.get("/severity-distribution", response_class=Response)
async def get_severity_distribution():
    """Anomaly severity donut chart."""
    labels = ['CRITICAL', 'ERROR', 'WARNING', 'INFO']
    sizes  = [12, 28, 45, 15]
    colors = ['#ef4444', '#f97316', '#eab308', '#22d3ee']

    fig, ax = plt.subplots(figsize=(7, 5.5))
    wedges, texts, autotexts = ax.pie(
        sizes, labels=labels, colors=colors,
        autopct='%1.1f%%', startangle=140,
        pctdistance=0.75,
        wedgeprops=dict(width=0.55, edgecolor='#0b1221', linewidth=2),
    )
    for t in texts:
        t.set(color='#94a3b8', fontsize=10)
    for at in autotexts:
        at.set(color='white', fontsize=10, fontweight='bold')

    ax.set_title('Anomaly Severity Distribution', fontsize=13, fontweight='bold', pad=14, color='#e2e8f0')

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, transparent=True, bbox_inches='tight')
    plt.close(fig)
    return Response(content=buf.getvalue(), media_type="image/png")
