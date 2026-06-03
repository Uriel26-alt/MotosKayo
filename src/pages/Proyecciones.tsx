import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './Proyecciones.module.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SaleData {
  date: Date;
  total: number;
  items: any[];
  productId?: string;
  productName?: string;
  quantity?: number;
}

interface ProductPerformance {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
  frequency: number;
}

interface Prediction {
  date: string;
  predictedSales: number;
  confidence: number;
}

export default function Proyecciones() {
  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '365d'>('30d');

  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);
      try {
        const salesSnapshot = await getDocs(collection(db, 'sales'));
        const sales: SaleData[] = [];

        salesSnapshot.forEach((doc) => {
          const data = doc.data();
          const saleDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);

          if (data.items && Array.isArray(data.items)) {
            data.items.forEach((item: any) => {
              sales.push({
                date: saleDate,
                total: item.price * item.quantity,
                items: [item],
                productId: item.productId,
                productName: item.name,
                quantity: item.quantity
              });
            });
          }
        });

        sales.sort((a, b) => a.date.getTime() - b.date.getTime());
        setSalesData(sales);
      } catch (error) {
        console.error('Error al cargar datos de ventas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  // ══════════════════════════════════════════════════════════════
  // ALGORITMOS DE MINERÍA DE DATOS
  // ══════════════════════════════════════════════════════════════

  // 1. Filtrar datos según rango temporal
  const filteredSales = useMemo(() => {
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
    const days = daysMap[timeRange];
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return salesData.filter(sale => sale.date >= cutoffDate);
  }, [salesData, timeRange]);

  // 2. Agrupar ventas por día
  const dailySales = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredSales.forEach(sale => {
      const dateKey = sale.date.toISOString().split('T')[0];
      grouped.set(dateKey, (grouped.get(dateKey) || 0) + sale.total);
    });

    return Array.from(grouped.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  // 3. REGRESIÓN LINEAL - Calcular tendencia
  const linearRegression = useMemo(() => {
    if (dailySales.length < 2) return { slope: 0, intercept: 0 };

    const n = dailySales.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    dailySales.forEach((point, index) => {
      sumX += index;
      sumY += point.total;
      sumXY += index * point.total;
      sumXX += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }, [dailySales]);

  // 4. PROMEDIO MÓVIL - Suavizar datos (MA-7)
  const movingAverage = useMemo(() => {
    const window = 7;
    const ma: number[] = [];

    for (let i = 0; i < dailySales.length; i++) {
      if (i < window - 1) {
        ma.push(dailySales[i].total);
      } else {
        const sum = dailySales
          .slice(i - window + 1, i + 1)
          .reduce((acc, val) => acc + val.total, 0);
        ma.push(sum / window);
      }
    }

    return ma;
  }, [dailySales]);

  // 5. PREDICCIÓN - Próximos 7 días usando regresión
  const predictions = useMemo((): Prediction[] => {
    const { slope, intercept } = linearRegression;
    const lastIndex = dailySales.length - 1;
    const predictions: Prediction[] = [];

    for (let i = 1; i <= 7; i++) {
      const predictedValue = slope * (lastIndex + i) + intercept;
      const lastDate = dailySales.length > 0
        ? new Date(dailySales[dailySales.length - 1].date)
        : new Date();

      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);

      // Calcular intervalo de confianza (simplificado)
      const variance = dailySales.reduce((sum, point, idx) => {
        const predicted = slope * idx + intercept;
        return sum + Math.pow(point.total - predicted, 2);
      }, 0) / dailySales.length;

      const stdDev = Math.sqrt(variance);
      const confidence = Math.max(0, 100 - (stdDev / predictedValue) * 100);

      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        predictedSales: Math.max(0, predictedValue),
        confidence: Math.min(100, confidence)
      });
    }

    return predictions;
  }, [dailySales, linearRegression]);

  // 6. ANÁLISIS DE PRODUCTOS - Clustering por rendimiento
  const productPerformance = useMemo((): ProductPerformance[] => {
    const productMap = new Map<string, ProductPerformance>();

    filteredSales.forEach(sale => {
      if (!sale.productId) return;

      const existing = productMap.get(sale.productId);
      if (existing) {
        existing.totalSold += sale.quantity || 0;
        existing.revenue += sale.total;
        existing.frequency += 1;
      } else {
        productMap.set(sale.productId, {
          productId: sale.productId,
          productName: sale.productName || 'Producto desconocido',
          totalSold: sale.quantity || 0,
          revenue: sale.total,
          frequency: 1
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredSales]);

  // 7. ANÁLISIS DE ESTACIONALIDAD - Detectar patrones por día de la semana
  const weekdayAnalysis = useMemo(() => {
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const salesByDay = new Array(7).fill(0);
    const countByDay = new Array(7).fill(0);

    filteredSales.forEach(sale => {
      const dayOfWeek = sale.date.getDay();
      salesByDay[dayOfWeek] += sale.total;
      countByDay[dayOfWeek] += 1;
    });

    return weekdays.map((day, idx) => ({
      day,
      avgSales: countByDay[idx] > 0 ? salesByDay[idx] / countByDay[idx] : 0
    }));
  }, [filteredSales]);

  // ══════════════════════════════════════════════════════════════
  // MÉTRICAS CLAVE
  // ══════════════════════════════════════════════════════════════

  const metrics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const avgDailySales = dailySales.length > 0
      ? totalRevenue / dailySales.length
      : 0;

    const growthRate = linearRegression.slope / (linearRegression.intercept || 1) * 100;

    const next7DaysRevenue = predictions.reduce((sum, pred) => sum + pred.predictedSales, 0);

    return {
      totalRevenue,
      avgDailySales,
      growthRate,
      next7DaysRevenue,
      totalTransactions: filteredSales.length
    };
  }, [filteredSales, dailySales, linearRegression, predictions]);

  // ══════════════════════════════════════════════════════════════
  // CONFIGURACIÓN DE GRÁFICOS
  // ══════════════════════════════════════════════════════════════

  const trendChartData = {
    labels: [
      ...dailySales.map(d => new Date(d.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })),
      ...predictions.map(p => new Date(p.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }))
    ],
    datasets: [
      {
        label: 'Ventas reales',
        data: [...dailySales.map(d => d.total), ...new Array(predictions.length).fill(null)],
        borderColor: 'rgb(233, 90, 12)',
        backgroundColor: 'rgba(233, 90, 12, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6
      },
      {
        label: 'Promedio móvil (7 días)',
        data: [...movingAverage, ...new Array(predictions.length).fill(null)],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: 'Predicción (7 días)',
        data: [...new Array(dailySales.length).fill(null), ...predictions.map(p => p.predictedSales)],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderDash: [10, 5],
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointStyle: 'triangle'
      }
    ]
  };

  const productChartData = {
    labels: productPerformance.map(p => p.productName.length > 15 ? p.productName.slice(0, 13) + '...' : p.productName),
    datasets: [{
      label: 'Ingresos por producto',
      data: productPerformance.map(p => p.revenue),
      backgroundColor: [
        'rgba(233, 90, 12, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(20, 184, 166, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(156, 163, 175, 0.8)',
        'rgba(99, 102, 241, 0.8)'
      ],
      borderColor: 'rgba(255, 255, 255, 1)',
      borderWidth: 2
    }]
  };

  const weekdayChartData = {
    labels: weekdayAnalysis.map(w => w.day),
    datasets: [{
      label: 'Ventas promedio',
      data: weekdayAnalysis.map(w => w.avgSales),
      backgroundColor: 'rgba(233, 90, 12, 0.6)',
      borderColor: 'rgb(233, 90, 12)',
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#1f2937', font: { size: 11, weight: '600' } }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += '$' + context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
          color: '#6b7280'
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      x: {
        ticks: { color: '#6b7280', maxRotation: 45, minRotation: 0 },
        grid: { display: false }
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Analizando datos y generando proyecciones...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Proyección de Ventas</h1>
          <p className={styles.subtitle}>Análisis predictivo mediante minería de datos</p>
        </div>
        <div className={styles.timeRangeSelector}>
          {[
            { value: '7d' as const, label: '7 días' },
            { value: '30d' as const, label: '30 días' },
            { value: '90d' as const, label: '90 días' },
            { value: '365d' as const, label: '1 año' }
          ].map(option => (
            <button
              key={option.value}
              className={`${styles.rangeBtn} ${timeRange === option.value ? styles.rangeActive : ''}`}
              onClick={() => setTimeRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas clave */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: 'rgba(233, 90, 12, 0.1)' }}>
            <svg viewBox="0 0 24 24" fill="rgb(233, 90, 12)">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
            </svg>
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricLabel}>Ingresos totales</p>
            <p className={styles.metricValue}>${metrics.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <svg viewBox="0 0 24 24" fill="rgb(59, 130, 246)">
              <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
            </svg>
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricLabel}>Promedio diario</p>
            <p className={styles.metricValue}>${metrics.avgDailySales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: metrics.growthRate >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
            <svg viewBox="0 0 24 24" fill={metrics.growthRate >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}>
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricLabel}>Tasa de crecimiento</p>
            <p className={styles.metricValue} style={{ color: metrics.growthRate >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)' }}>
              {metrics.growthRate >= 0 ? '+' : ''}{metrics.growthRate.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
            <svg viewBox="0 0 24 24" fill="rgb(168, 85, 247)">
              <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
            </svg>
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricLabel}>Proyección 7 días</p>
            <p className={styles.metricValue}>${metrics.next7DaysRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Gráfico principal: Tendencia y predicción */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>Análisis de tendencias y predicción</h2>
          <span className={styles.chartBadge}>Regresión lineal + Promedio móvil</span>
        </div>
        <div className={styles.chartContainer}>
          <Line data={trendChartData} options={chartOptions} />
        </div>
      </div>

      {/* Segunda fila: Productos y Estacionalidad */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard} style={{ flex: 1.5 }}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Top 10 productos por ingresos</h2>
            <span className={styles.chartBadge}>Clustering</span>
          </div>
          <div className={styles.chartContainer} style={{ height: '350px' }}>
            <Doughnut
              data={productChartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    position: 'right',
                    labels: {
                      color: '#1f2937',
                      font: { size: 10 },
                      boxWidth: 12,
                      padding: 10
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className={styles.chartCard} style={{ flex: 1 }}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Estacionalidad por día</h2>
            <span className={styles.chartBadge}>Análisis temporal</span>
          </div>
          <div className={styles.chartContainer} style={{ height: '350px' }}>
            <Bar data={weekdayChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Tabla de predicciones */}
      <div className={styles.predictionsCard}>
        <h2 className={styles.chartTitle}>Predicción detallada - Próximos 7 días</h2>
        <table className={styles.predictionsTable}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ventas proyectadas</th>
              <th>Nivel de confianza</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((pred, idx) => {
              const confidence = pred.confidence;
              const confidenceColor = confidence >= 75 ? '#22c55e' : confidence >= 50 ? '#eab308' : '#ef4444';
              return (
                <tr key={idx}>
                  <td>{new Date(pred.date).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                  <td className={styles.predValue}>${pred.predictedSales.toFixed(2)}</td>
                  <td>
                    <div className={styles.confidenceBar}>
                      <div
                        className={styles.confidenceFill}
                        style={{ width: `${confidence}%`, backgroundColor: confidenceColor }}
                      ></div>
                      <span className={styles.confidenceText}>{confidence.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{ backgroundColor: confidenceColor + '20', color: confidenceColor }}
                    >
                      {confidence >= 75 ? 'Alta certeza' : confidence >= 50 ? 'Certeza media' : 'Baja certeza'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer informativo */}
      <div className={styles.infoFooter}>
        <div className={styles.infoSection}>
          <h3>Algoritmos utilizados</h3>
          <ul>
            <li><strong>Regresión lineal:</strong> Cálculo de tendencia general de ventas</li>
            <li><strong>Promedio móvil (MA-7):</strong> Suavizado de fluctuaciones diarias</li>
            <li><strong>Clustering:</strong> Agrupación de productos por rendimiento</li>
            <li><strong>Análisis de estacionalidad:</strong> Detección de patrones por día de la semana</li>
          </ul>
        </div>
        <div className={styles.infoSection}>
          <h3>Interpretación</h3>
          <ul>
            <li><strong>Tasa de crecimiento:</strong> Indica si las ventas están aumentando o disminuyendo</li>
            <li><strong>Nivel de confianza:</strong> Mayor porcentaje = predicción más fiable</li>
            <li><strong>Productos top:</strong> Identifica los artículos más rentables</li>
            <li><strong>Mejores días:</strong> Optimiza inventario según demanda semanal</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
