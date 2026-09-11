import type { ReactNode } from 'react';
import '../styles/theme.css';

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="snitch-root" style={{ padding: 'clamp(16px, 6vw, 40px)' }}>
      <h1 style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 'clamp(24px, 7vw, 32px)', textAlign: 'center' }}>
        CÓMO SE JUEGA
      </h1>

      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
        <Section title="Objetivo">
          Sos el último en pie. Ganás cuando todos los demás quedan eliminados.
        </Section>

        <Section title="Tu mano">
          Empezás con 3 cartas y 4 corazones. Las cartas van de A a K en los 4 palos de siempre, más 2 Jokers
          en todo el mazo.
        </Section>

        <Section title="Tu turno: 3 opciones">
          <p style={{ margin: '4px 0' }}>
            <b style={{ color: 'var(--snitch-accent)' }}>KILL</b> — Elegís una carta del mazo (cualquiera, incluso una
            que vos mismo tengas). Si alguien la tiene, se la descartan y vos te curás 1 corazón. Si nadie la tiene,
            perdés 1 corazón.
          </p>
          <p style={{ margin: '4px 0' }}>
            <b style={{ color: 'var(--snitch-accent)' }}>PREGUNTAR</b> — Elegís una pregunta de una lista (¿alguien
            tiene una carta mayor a X?, de tal palo, etc.) y ves quién responde ✓ o ✗. No cuesta nada, pero tampoco
            te dice exactamente qué carta tienen.
          </p>
          <p style={{ margin: '4px 0' }}>
            <b style={{ color: 'var(--snitch-accent)' }}>PASAR</b> — No hacés nada, y le pasás el turno al
            siguiente.
          </p>
        </Section>

        <Section title="El bluff">
          Podés elegir KILL sobre una carta que vos mismo tenés. Si nadie más la tiene, perdés 1 corazón como
          cualquier fallo — pero nadie se entera de que era un bluff. Es indistinguible de un fallo real: esa es
          la gracia.
        </Section>

        <Section title="Eliminación">
          Quedás eliminado si te quedás sin cartas (te descubrieron las 3) o sin corazones. Los eliminados pueden
          seguir mirando la partida hasta que termine, o salir.
        </Section>

        <Section title="El Joker">
          Hay 2 en el mazo, sin palo ni número. Nunca cumplen ninguna pregunta — la única forma de descubrir uno
          es arriesgando un KILL directo sobre él.
        </Section>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button className="snitch-btn-accent" onClick={onBack}>
          VOLVER
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ color: 'var(--snitch-accent)', fontSize: 15, letterSpacing: 1, margin: '0 0 4px' }}>
        {title.toUpperCase()}
      </p>
      <div style={{ fontSize: 16, lineHeight: 1.4 }}>{children}</div>
    </div>
  );
}
