import { Box, Typography } from '@mui/material';

export default function NotFoundPage() {
  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h4">404</Typography>
      <Typography color="text.secondary">Página no encontrada.</Typography>
    </Box>
  );
}
