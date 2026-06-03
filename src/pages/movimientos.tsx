import { useEffect, useState, useMemo, useRef } from 'react';
import styles from './movimientos.module.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Movimiento {
  id: string;
  tipo: 'Venta' | 'Servicio' | 'Compra';
  fecha: string;
  total: number;
  usuario: string;
}

function Movimientos() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [filtroFecha, setFiltroFecha] = useState('');

  const movimientosFiltrados = useMemo(() => {
    if (!filtroFecha) return movimientos;
    return movimientos.filter((mov) => {
      // Convertir a fecha local para comparar correctamente
      const fechaObj = new Date(mov.fecha);
      const movFechaLocal = fechaObj.toLocaleDateString('sv-SE'); // YYYY-MM-DD en zona horaria local

      console.log('Comparando:', {
        fechaISO: mov.fecha,
        fechaLocal: movFechaLocal,
        filtro: filtroFecha,
        coincide: movFechaLocal === filtroFecha
      });

      return movFechaLocal === filtroFecha;
    });
  }, [movimientos, filtroFecha]);

  const gananciaTotal = useMemo(() => {
    if (!filtroFecha) return 0;
    return movimientosFiltrados.reduce((acc, mov) =>
      mov.tipo === 'Compra' ? acc - mov.total : acc + mov.total, 0
    );
  }, [movimientosFiltrados, filtroFecha]);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof (input as any).showPicker === 'function') {
      (input as any).showPicker();
    } else {
      input.focus();
    }
  };

  const getVentas = async () => {
    const querySnapshot = await getDocs(collection(db, "sales"));
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const fecha = data.date?.toDate?.() || new Date();
      let total = 0;
      if (typeof data.total === 'number') {
        total = data.total;
      } else if (Array.isArray(data.items)) {
        total = data.items.reduce((acc: number, item: any) => {
          const itemTotal = Number(item.total);
          if (!isNaN(itemTotal)) {
            return acc + itemTotal;
          }
          return acc;
        }, 0);
      }
      return {
        id: doc.id,
        tipo: 'Venta' as const,
        fecha: fecha.toISOString(),
        total,
        usuario: data.userId || 'N/D',
      };
    });
  };

  const getServicios = async () => {
    const querySnapshot = await getDocs(collection(db, "services"));
    return querySnapshot.docs
      .map((doc) => {
        const data = doc.data();
        if (data.status !== 'finalizado') return null;
        const fecha = data.endDate ? new Date(data.endDate) : new Date();
        return {
          id: doc.id,
          tipo: 'Servicio' as const,
          fecha: fecha.toISOString(),
          total: data.totalCost || 0,
          usuario: data.mechanic || 'Sin asignar',
        };
      })
      .filter((serv): serv is Required<Movimiento> & { tipo: 'Servicio' } => serv !== null);
  };

  const getCompras = async () => {
    const querySnapshot = await getDocs(collection(db, "compras"));
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const fecha = data.fecha?.toDate?.() || new Date();
      return {
        id: doc.id,
        tipo: 'Compra' as const,
        fecha: fecha.toISOString(),
        total: data.precioTotal || 0,
        usuario: data.usuario || 'Sistema',
      };
    });
  };

  const obtenerMovimientos = async () => {
    try {
      const [ventas, servicios, compras] = await Promise.all([
        getVentas(),
        getServicios(),
        getCompras(),
      ]);
      const todos = [...ventas, ...servicios, ...compras];
      todos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      console.log('=== MOVIMIENTOS CARGADOS ===');
      todos.forEach(mov => {
        const fechaISO = mov.fecha;
        const fechaObj = new Date(mov.fecha);
        const fechaLocal = fechaObj.toLocaleDateString('sv-SE');
        console.log(`${mov.tipo} - ISO: ${fechaISO} | Local: ${fechaLocal} | Split: ${fechaISO.split('T')[0]}`);
      });

      setMovimientos(todos);
    } catch (error) {
      console.error("Error al obtener movimientos:", error);
    }
  };


  useEffect(() => {
    obtenerMovimientos();
  }, []);

const generatePDF = async () => {
  const NEGRO:        [number, number, number] = [0, 0, 0];
  const BLANCO:       [number, number, number] = [255, 255, 255];
  const NARANJA:      [number, number, number] = [233, 90, 12];
  const NARANJA_SUAVE:[number, number, number] = [255, 242, 233];

  // Cargar logo como base64
  const logoImg = new Image();
  logoImg.src = '/images/LogoKayo.png';
  await new Promise<void>((resolve) => {
    logoImg.onload = () => resolve();
    logoImg.onerror = () => resolve();
  });
  const logoCanvas = document.createElement('canvas');
  logoCanvas.width  = logoImg.naturalWidth  || 200;
  logoCanvas.height = logoImg.naturalHeight || 200;
  logoCanvas.getContext('2d')!.drawImage(logoImg, 0, 0);
  const logoBase64 = logoCanvas.toDataURL('image/png');

  const docPDF = new jsPDF('p', 'mm', 'a4');
  const pageWidth = docPDF.internal.pageSize.getWidth();

  // ── Banda negra del encabezado ───────────────────────
  docPDF.setFillColor(...NEGRO);
  docPDF.rect(0, 0, pageWidth, 38, 'F');

  // Logo
  docPDF.addImage(logoBase64, 'PNG', 8, 4, 30, 30);

  // Nombre y subtítulo en blanco
  docPDF.setFont('helvetica', 'bold');
  docPDF.setFontSize(22);
  docPDF.setTextColor(...BLANCO);
  docPDF.text('Kayo', 44, 18);

  docPDF.setFont('helvetica', 'normal');
  docPDF.setFontSize(10);
  docPDF.text('Resumen de movimientos', 44, 27);

  // Fecha de generación alineada a la derecha
  docPDF.setFontSize(9);
  docPDF.text(`Generado: ${new Date().toLocaleString()}`, pageWidth - 12, 18, { align: 'right' });
  if (filtroFecha) {
    docPDF.text(`Filtro: ${filtroFecha}`, pageWidth - 12, 27, { align: 'right' });
  }

  // ── Franja naranja separadora ────────────────────────
  docPDF.setFillColor(...NARANJA);
  docPDF.rect(0, 38, pageWidth, 3, 'F');

  // ── Tabla ────────────────────────────────────────────
  const headers = [['Tipo', 'Fecha', 'Total', 'Usuario/Responsable']];
  const data = movimientosFiltrados.map((mov) => [
    mov.tipo,
    new Date(mov.fecha).toLocaleString(),
    `$${mov.total.toFixed(2)}`,
    mov.usuario,
  ]);

  autoTable(docPDF, {
    startY: 45,
    head: headers,
    body: data,
    theme: 'grid',
    headStyles: {
      fillColor: NARANJA,
      textColor: BLANCO,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 10,
      textColor: NEGRO,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: NARANJA_SUAVE },
    styles: { cellPadding: 3 },
    tableLineColor: NARANJA,
    tableLineWidth: 0.1,
    margin: { left: 10, right: 10 },
  });

  // ── Total neto ───────────────────────────────────────
  const finalY = (docPDF as any).lastAutoTable?.finalY || 45;

  docPDF.setDrawColor(...NARANJA);
  docPDF.setLineWidth(0.6);
  docPDF.line(10, finalY + 6, pageWidth - 10, finalY + 6);

  docPDF.setFontSize(13);
  docPDF.setFont('helvetica', 'bold');
  docPDF.setTextColor(...NARANJA);
  docPDF.text('TOTAL NETO:', 10, finalY + 14);
  docPDF.text(`$${gananciaTotal.toFixed(2)}`, pageWidth - 10, finalY + 14, { align: 'right' });

  // ── Footer ───────────────────────────────────────────
  docPDF.setFillColor(...NARANJA);
  docPDF.rect(0, 277, pageWidth, 3, 'F');

  docPDF.setFontSize(8);
  docPDF.setFont('helvetica', 'normal');
  docPDF.setTextColor(120, 120, 120);
  docPDF.text(
    'Carretera Puerto Ángel #123, San Juan Chilateca, Oaxaca  |  Tel: 951-873-37-95',
    pageWidth / 2, 285, { align: 'center' }
  );

  docPDF.save('movimientos.pdf');
};

  const generateExcel = () => {
    const wsData = [
      ['ID', 'Movimiento', 'Fecha', 'Total', 'Usuario'],
      ...movimientosFiltrados.map((mov) => [
        mov.id,
        mov.tipo,
        new Date(mov.fecha).toLocaleString(),
        mov.total,
        mov.usuario
      ]),
      [],
      ['Ganancia total', '', '', gananciaTotal, '']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'movimientos.xlsx');
  };

  return (
    <div className={styles.containerMovimientos}>
      <div className={styles.headerMovimientos}>
        <h1 className={styles.titleMovimientos}>Movimientos</h1>
        <div className={styles.filterContainer}>
          {filtroFecha && (
            <div className={styles.ganancia}>
              Ganancia del día: <strong>${gananciaTotal.toFixed(2)}</strong>
            </div>
          )}
          <div className={styles.dateWrapper} onClick={openDatePicker}>
            <span className={styles.dateIcon}>📅</span>
            <input
              ref={dateInputRef}
              type="date"
              className={styles.dateInput}
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
            />
            {filtroFecha && (
              <button
                className={styles.clearDate}
                onClick={(e) => { e.stopPropagation(); setFiltroFecha(''); }}
              >✕</button>
            )}
          </div>
        </div>
      </div>

      <table className={styles.tableMovimientos}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Movimiento</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Usuario/Responsable</th>
          </tr>
        </thead>
        <tbody>
          {movimientosFiltrados.map((mov) => (
            <tr key={mov.id}>
              <td>{mov.id}</td>
              <td>
                <span className={`${styles.badge} ${styles[`badge${mov.tipo}`]}`}>
                  {mov.tipo}
                </span>
              </td>
              <td>{new Date(mov.fecha).toLocaleString()}</td>
              <td>${mov.total.toFixed(2)}</td>
              <td>{mov.usuario}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.buttonsContainer}>
        <button onClick={generatePDF} className={styles.actionBtn}>
          Generar PDF
        </button>
        <button onClick={generateExcel} className={styles.actionBtn}>
          Exportar Excel
        </button>
      </div>
    </div>
  );
}

export default Movimientos;
