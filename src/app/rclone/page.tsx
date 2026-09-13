export const metadata = {
  title: "Rclone Raspberry",
  description: "Información sobre la integración privada Rclone Raspberry.",
};

export default function RclonePage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <h1>Rclone Raspberry</h1>
      <p>
        Rclone Raspberry es una integración privada utilizada por el propietario de este sitio para realizar
        copias de seguridad de una Raspberry Pi en su propia cuenta de Google Drive mediante rclone.
      </p>
      <p>
        La aplicación no se ofrece como servicio a terceros, no vende datos y no comparte información con
        anunciantes ni con otras empresas.
      </p>
      <p>
        El acceso a Google Drive se utiliza exclusivamente para crear, leer, actualizar y eliminar los archivos
        de copia de seguridad gestionados por el propio usuario.
      </p>
      <p>
        <a href="/rclone/privacy">Política de privacidad</a>
      </p>
      <p>Contacto: alexlose2@gmail.com</p>
    </main>
  );
}
