const Ayuda = () => {
  const docUrl = "https://docs.google.com/document/d/1HzadlcJDXXfIRKEpclzhj9RuURRXNZbg7zLcR9xac88/edit?usp=sharing";

  return (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <h1>Ayuda</h1>
      <iframe
        src={docUrl}
        style={{ width: '100%', height: '90vh', border: 'none' }}
        title="Documento de Ayuda"
        allowFullScreen
      />
    </div>
  );
};

export default Ayuda;
