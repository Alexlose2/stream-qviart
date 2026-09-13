export const metadata = {
  title: "Política de privacidad | Rclone Raspberry",
  description: "Política de privacidad de la integración privada Rclone Raspberry.",
};

export default function RclonePrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <h1>Política de privacidad</h1>
      <p>Última actualización: 13 de septiembre de 2026.</p>
      <p>
        Rclone Raspberry es una integración privada utilizada únicamente por el propietario para realizar copias
        de seguridad de una Raspberry Pi en su propia cuenta de Google Drive mediante rclone.
      </p>
      <h2>Datos a los que se accede</h2>
      <p>
        La aplicación puede acceder a archivos y carpetas de Google Drive en la medida necesaria para crear,
        leer, actualizar y eliminar copias de seguridad gestionadas por el propio usuario.
      </p>
      <h2>Uso de los datos</h2>
      <p>
        Los datos se utilizan exclusivamente para el funcionamiento de las copias de seguridad. No se venden,
        no se utilizan para publicidad y no se comparten con terceros salvo cuando sea técnicamente necesario
        para prestar el servicio de Google Drive solicitado por el usuario.
      </p>
      <h2>Conservación y seguridad</h2>
      <p>
        Las credenciales OAuth y los archivos de copia se mantienen bajo el control del propietario. El acceso
        puede revocarse en cualquier momento desde la configuración de seguridad de la cuenta de Google.
      </p>
      <h2>Contacto</h2>
      <p>Para cualquier consulta relacionada con esta integración: alexlose2@gmail.com.</p>
      <p><a href="/rclone">Volver a Rclone Raspberry</a></p>
    </main>
  );
}
