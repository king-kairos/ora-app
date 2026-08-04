export async function proposeChange(
  title: string,
  description: string,
  file: string,
  content: string
) {
  const payload = {
    title,
    description,
    files: [
      {
        path: file,
        content
      }
    ]
  };

  const res = await fetch('http://localhost:3000/ops/propose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OPS propose failed: ${text}`);
  }

  const data = await res.json();

  console.log('🧠 OPS AGENT → PROPUESTA REGISTRADA');
  console.log(data);

  return data;
}
