import { Box, Typography } from '@mui/material';

export default function ForbiddenPage() {
  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h4">403</Typography>
      <Typography color="text.secondary">No tienes acceso a este recurso.</Typography>
    </Box>
  );
}
