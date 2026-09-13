import client from './client.js';

export async function exportarExcel(carreraId) {
  const response = await client.get(`/carreras/${carreraId}/export/excel`, {
    responseType: 'blob',
  });
  const disposition = response.headers['content-disposition'] ?? '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : `mapa_${carreraId}.xlsx`;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
