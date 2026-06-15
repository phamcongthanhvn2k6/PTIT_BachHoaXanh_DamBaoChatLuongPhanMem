import http from 'http';

http.get('http://127.0.0.1:3001/api/products/000000000000000000117030/questions', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('API RESPONSE SUCCESS:', parsed.success);
      console.log('API QUESTIONS COUNT:', parsed.data?.length);
      if (parsed.data && parsed.data.length > 0) {
        console.log('Questions:', JSON.stringify(parsed.data, null, 2));
      }
    } catch (e) {
      console.log('Failed to parse JSON:', e.message);
      console.log('Raw data received:', data);
    }
  });
}).on('error', (err) => {
  console.log('Error hitting endpoint:', err.message);
});
