export default function PresencePage() {
  const whatsappLink =
    "https://chat.whatsapp.com/KXf5F1vKamr9X2U7Mw4d6V?s=sh&p=a&mlu=3";

  const modules = [
    {
      title: "Hablar con alguien",
      href: "#hablar",
      text: "Un espacio para expresar lo que sientes y recibir acompañamiento humano.",
    },
    {
      title: "Centro de calma",
      href: "#calma",
      text: "Respiración, pausa y ejercicios simples para volver al centro.",
    },
    {
      title: "Registro emocional",
      href: "#emociones",
      text: "Registrar cómo te sientes y empezar a observar tus patrones internos.",
    },
    {
      title: "Comunidad",
      href: "#comunidad",
      text: "Un grupo humano para escuchar, acompañar y crecer juntos.",
    },
    {
      title: "Meditación",
      href: "#meditacion",
      text: "Momentos guiados de silencio, respiración y presencia.",
    },
    {
      title: "Biblioteca de equilibrio",
      href: "#biblioteca",
      text: "Recursos sobre ansiedad, miedo, estrés, autoestima y claridad emocional.",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #f7f2df 0%, #e8f3ec 35%, #071108 100%)",
        color: "#071108",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "56px 20px",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(212,175,55,0.45)",
            borderRadius: 28,
            padding: 28,
            background: "rgba(255,255,255,0.85)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          }}
        >
          <p
            style={{
              color: "#0f6b4f",
              fontWeight: 800,
              letterSpacing: 2,
              margin: 0,
            }}
          >
            ORA PRESENCE
          </p>

          <h1
            style={{
              fontSize: "clamp(42px, 7vw, 82px)",
              lineHeight: 1,
              margin: "16px 0",
              color: "#061b24",
            }}
          >
            Tu espacio para volver a ti.
          </h1>

          <p
            style={{
              fontSize: 20,
              lineHeight: 1.6,
              maxWidth: 760,
              color: "#234",
            }}
          >
            ORA Presence es una comunidad creada para acompañar a personas que
            buscan calma, claridad emocional, crecimiento personal,
            autoconocimiento y bienestar interior.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 28,
            }}
          >
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              style={buttonGreen}
            >
              Unirme a la comunidad
            </a>

            <a href="#calma" style={buttonGold}>
              Necesito calma ahora
            </a>

            <a href="#emociones" style={buttonOutline}>
              Registrar cómo me siento
            </a>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          {modules.map((module) => (
            <a
              key={module.title}
              href={module.href}
              style={{
                borderRadius: 22,
                padding: 22,
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(15,107,79,0.22)",
                textDecoration: "none",
                color: "#061b24",
              }}
            >
              <h2>{module.title}</h2>
              <p>{module.text}</p>
            </a>
          ))}
        </div>

        <Section id="hablar" title="Hablar con alguien">
          No tienes que cargar todo solo. Este espacio está pensado para que
          puedas expresarte y encontrar acompañamiento humano.
        </Section>

        <Section dark id="calma" title="Centro de calma">
          Respira lentamente.
          <br />
          Inhala 4 segundos.
          <br />
          Mantén 2 segundos.
          <br />
          Exhala 6 segundos.
          <br />
          Repite tres veces.
        </Section>

        <Section id="emociones" title="Registro emocional">
          Próxima fase: registrar estados de ánimo, observar patrones y ayudar
          a las personas a conocerse mejor.
        </Section>

        <Section id="comunidad" title="Comunidad Presence">
          <p>
            La comunidad ya está activa.
          </p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            style={buttonGreen}
          >
            Entrar al grupo de WhatsApp
          </a>
        </Section>

        <Section id="meditacion" title="Meditación">
          Próximamente meditaciones guiadas de 1, 3, 5 y 10 minutos.
        </Section>

        <Section id="biblioteca" title="Biblioteca de equilibrio">
          Ansiedad, miedo, estrés, autoestima, relaciones, propósito y
          crecimiento personal.
        </Section>
      </section>
    </main>
  );
}

function Section({
  id,
  title,
  children,
  dark = false,
}: any) {
  return (
    <section
      id={id}
      style={{
        marginTop: 18,
        borderRadius: 24,
        padding: 24,
        background: dark ? "rgba(7,17,8,0.88)" : "rgba(255,255,255,0.9)",
        color: dark ? "white" : "#061b24",
      }}
    >
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

const buttonGreen = {
  padding: "14px 18px",
  borderRadius: 999,
  background: "#0f6b4f",
  color: "white",
  textDecoration: "none",
  fontWeight: 700,
};

const buttonGold = {
  padding: "14px 18px",
  borderRadius: 999,
  background: "#d4af37",
  color: "#061b24",
  textDecoration: "none",
  fontWeight: 700,
};

const buttonOutline = {
  padding: "14px 18px",
  borderRadius: 999,
  border: "1px solid #0f6b4f",
  color: "#0f6b4f",
  textDecoration: "none",
  fontWeight: 700,
};
