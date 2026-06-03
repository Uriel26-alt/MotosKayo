import { useState, useEffect } from 'react';
import styles from './ReportPage.module.css';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Sale } from '../types/Venta';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Servicio {
  id: string;
  status: string;
  endDate: Date;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

const ReportPage = () => {
  const [ventasSemanalData, setVentasSemanalData] = useState<{ name: string; ventas: number }[]>([]);
  const [productosMasVendidosData, setProductosMasVendidosData] = useState<{ name: string; ventas: number }[]>([]);
  const [serviciosSemanaData, setServiciosSemanaData] = useState<{ name: string; value: number }[]>([]);
  const [ventaDiariaData, setVentaDiariaData] = useState<{ name: string; cantidad: number }[]>([]);

  const getTodayRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { start: startOfWeek, end: endOfWeek };
  };

  const procesarVentasDiarias = (ventas: Sale[]) => {
    const productosMap = new Map<string, number>();
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        const nombreProducto = item.name || 'Sin nombre';
        const cantidad = item.quantity || 0;
        productosMap.set(nombreProducto, (productosMap.get(nombreProducto) || 0) + cantidad);
      });
    });
    const data = Array.from(productosMap.entries()).map(([name, cantidad]) => ({ name, cantidad }));
    setVentaDiariaData(data);
  };

  const procesarVentasSemanales = (ventas: Sale[]) => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const ventasPorDia = Array(7).fill(0);
    ventas.forEach(venta => {
      const fechaVenta = venta.date instanceof Date ? venta.date : new Date(venta.date);
      const localDate = new Date(fechaVenta.getTime() + fechaVenta.getTimezoneOffset() * -60000);
      const diaSemana = (localDate.getDay() + 6) % 7;
      ventasPorDia[diaSemana] += venta.total;
    });
    const data = days.map((day, index) => ({ name: day, ventas: ventasPorDia[index] }));
    setVentasSemanalData(data);
  };

  const procesarProductosMasVendidos = (ventas: Sale[]) => {
    const productosMap = new Map<string, number>();
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        const nombreProducto = item.name || 'Producto sin nombre';
        const cantidad = item.quantity || 0;
        productosMap.set(nombreProducto, (productosMap.get(nombreProducto) || 0) + cantidad);
      });
    });
    const data = Array.from(productosMap.entries())
      .map(([name, ventas]) => ({ name, ventas }))
      .sort((a, b) => b.ventas - a.ventas);
    setProductosMasVendidosData(data);
  };

  const procesarServiciosSemanales = (servicios: Servicio[]) => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const serviciosPorDia = Array(7).fill(0);
    servicios.forEach(servicio => {
      const localEndDate = new Date(servicio.endDate.getTime() + servicio.endDate.getTimezoneOffset() * -60000);
      const diaSemana = (localEndDate.getDay() + 6) % 7;
      serviciosPorDia[diaSemana] += 1;
    });
    const data = days.map((day, index) => ({ name: day, value: serviciosPorDia[index] }));
    setServiciosSemanaData(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { start: startWeek, end: endWeek } = getWeekRange();
        const { start: startToday, end: endToday } = getTodayRange();

        const ventasQuery = query(
          collection(db, 'sales'),
          where('date', '>=', Timestamp.fromDate(startWeek)),
          where('date', '<=', Timestamp.fromDate(endWeek))
        );
        const ventasSnapshot = await getDocs(ventasQuery);
        const ventas: Sale[] = ventasSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            clientId: data.clientId || null,
            clientName: data.clientName || 'Público en general',
            subtotal: data.subtotal || 0,
            tax: data.tax || 0,
            total: data.total || 0,
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
            items: data.items || [],
          };
        });

        const serviciosQuery = query(collection(db, 'services'), where('status', '==', 'finalizado'));
        const serviciosSnapshot = await getDocs(serviciosQuery);
        const servicios: Servicio[] = serviciosSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            status: data.status,
            endDate: new Date(data.endDate),
          };
        });

        const serviciosSemana = servicios.filter(s => s.endDate >= startWeek && s.endDate <= endWeek);
        const ventasHoy = ventas.filter(v => v.date >= startToday && v.date <= endToday);

        procesarVentasSemanales(ventas);
        procesarProductosMasVendidos(ventas);
        procesarServiciosSemanales(serviciosSemana);
        procesarVentasDiarias(ventasHoy);
      } catch (error) {
        console.error('Error al obtener datos:', error);
      }
    };

    fetchData();
  }, []);
const exportPDF = () => {
  const input = document.getElementById('report-container');
  if (!input) return;

  html2canvas(input, { scale: 2 }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' para landscape
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 297 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 210 mm

    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    const finalHeight = imgHeight > pdfHeight ? pdfHeight : imgHeight;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, finalHeight);
    pdf.save('reporte.pdf');
  });
};

  return (
    <div className={styles.container}>
      <div id="report-container">
        <div className={styles.row}>
          {/* Ventas semanales */}
          <div className={styles.card}>
            <h2 className={styles.title}>Ventas semanales</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={ventasSemanalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ventas" stroke="#E97C00" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Productos más vendidos */}
          <div className={styles.card}>
            <h2 className={styles.title}>Productos más vendidos</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={productosMasVendidosData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="ventas" fill="#E97C00" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.row}>
          {/* Servicios realizados */}
          <div className={styles.card}>
            <h2 className={styles.title}>Servicios realizados por semana</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={serviciosSemanaData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  fill="#E97C00"
                  label
                >
                  {serviciosSemanaData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Venta diaria */}
          <div className={styles.card}>
            <h2 className={styles.title}>Venta diaria</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ventaDiariaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#E97C00" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={exportPDF}>Exportar PDF</button>
      </div>
    </div>
  );
};

export default ReportPage;
