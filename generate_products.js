const names = [
  'Bluetooth Speaker',
  'Portable Charger',
  'Noise Cancelling Earbuds',
  'Smart Lamp',
  'Ergonomic Mouse',
  '4K Webcam'
];

function randFrom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function randPrice() { return (Math.random()*200 + 10).toFixed(2); }

async function main() {
  const items = Array.from({length:3}).map(() => ({
    name: randFrom(names) + ' ' + Math.floor(Math.random()*1000),
    price: randPrice(),
    description: 'Auto-generated product',
    image: '📦'
  }));

  for (const it of items) {
    const res = await fetch('http://localhost:8080/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(it)
    });
    const body = await res.text();
    console.log(res.status, body);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
