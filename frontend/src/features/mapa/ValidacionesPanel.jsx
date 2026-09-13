import { Alert, Stack } from '@mui/material';

export default function ValidacionesPanel({ violations }) {
  if (!violations || violations.length === 0) return null;
  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {violations.map((v, index) => (
        <Alert key={`${v.code}-${index}`} severity={v.severity === 'ERROR' ? 'error' : 'warning'}>
          {v.message}
        </Alert>
      ))}
    </Stack>
  );
}
