import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import { Box, Button, Tab, Tabs, Typography } from '@mui/material';
import { exportarExcel } from '../api/export.js';
import MapaCurricular from '../features/mapa/MapaCurricular.jsx';
import OptativasTable from '../features/optativas/OptativasTable.jsx';
import { useCarrera } from '../hooks/useCarreras.js';

export default function CarreraPage() {
  const { carreraId } = useParams();
  const id = Number(carreraId);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'optativas' ? 'optativas' : 'mapa';
  const [exportando, setExportando] = useState(false);

  const { data: carrera, isLoading, isError } = useCarrera(id);

  const cambiarTab = (_event, value) => {
    setSearchParams({ tab: value });
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      await exportarExcel(id);
    } finally {
      setExportando(false);
    }
  };

  const contenido = useMemo(() => {
    if (tab === 'optativas') return <OptativasTable carreraId={id} />;
    return <MapaCurricular carreraId={id} />;
  }, [tab, id]);

  if (isLoading) return <Typography>Cargando…</Typography>;
  if (isError || !carrera) {
    return <Typography color="error">No se pudo cargar la carrera.</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" gutterBottom>
          {carrera.nombre} ({carrera.clave})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportar}
          disabled={exportando}
        >
          {exportando ? 'Exportando…' : 'Exportar a Excel'}
        </Button>
      </Box>
      <Tabs value={tab} onChange={cambiarTab} sx={{ mb: 2 }}>
        <Tab label="Mapa curricular" value="mapa" />
        <Tab label="Optativas" value="optativas" />
      </Tabs>
      {contenido}
    </Box>
  );
}
