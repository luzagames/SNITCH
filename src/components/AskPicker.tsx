import { useState } from 'react';
import { RANK_LABELS, SUIT_LABELS, questionLabel, validateQuestion } from '../game/askQuestions';
import type { AskQuestion, AskQuestionId, Rank, Suit } from '../game/types';

const RANK_OPTIONS = Object.keys(RANK_LABELS).map((k) => Number(k) as Rank);
const SUIT_OPTIONS = Object.keys(SUIT_LABELS) as Suit[];

const QUESTION_MENU: { id: AskQuestionId; label: string }[] = [
  { id: 'GREATER_THAN', label: 'Mayor que X' },
  { id: 'LOWER_THAN', label: 'Menor que X' },
  { id: 'BETWEEN', label: 'Entre X e Y' },
  { id: 'OF_SUIT', label: 'De palo X' },
  { id: 'OF_VALUE', label: 'De valor X' },
  { id: 'REPEATED_VALUE_IN_HAND', label: '¿Alguien tiene un valor repetido en su mano?' },
];

// Preguntas que no necesitan parámetros extra: se mandan apenas se tocan,
// sin pasar por el paso de "Confirmar".
const NO_PARAM_QUESTIONS: AskQuestionId[] = ['REPEATED_VALUE_IN_HAND'];

export function AskPicker({
  onSubmit,
  onCancel,
}: {
  onSubmit: (question: AskQuestion) => void;
  onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState<AskQuestionId | null>(null);
  const [value, setValue] = useState<Rank>(1);
  const [min, setMin] = useState<Rank>(1);
  const [max, setMax] = useState<Rank>(13);
  const [suit, setSuit] = useState<Suit>('spades');
  const [error, setError] = useState<string | null>(null);

  const selectStyle = { fontSize: 18, padding: '8px 6px', minHeight: 40 };

  function selectQuestion(id: AskQuestionId) {
    setSelectedId(id);
    setError(null);
    if (NO_PARAM_QUESTIONS.includes(id)) {
      onSubmit({ id });
    }
  }

  function buildQuestion(): AskQuestion | null {
    if (!selectedId) return null;
    switch (selectedId) {
      case 'GREATER_THAN':
      case 'LOWER_THAN':
      case 'OF_VALUE':
        return { id: selectedId, value };
      case 'BETWEEN':
        return { id: 'BETWEEN', min, max };
      case 'OF_SUIT':
        return { id: 'OF_SUIT', suit };
      case 'REPEATED_VALUE_IN_HAND':
        return { id: 'REPEATED_VALUE_IN_HAND' };
    }
  }

  function handleConfirm() {
    const question = buildQuestion();
    if (!question) return;
    try {
      validateQuestion(question);
      onSubmit(question);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div style={{ border: '2px solid var(--snitch-fg)', padding: 'clamp(8px, 3vw, 16px)', width: 'min(480px, 95vw)', margin: '0 auto', boxSizing: 'border-box' }}>
      <p style={{ fontSize: 'clamp(18px, 5vw, 20px)', marginTop: 0 }}>Elegí una pregunta:</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {QUESTION_MENU.map((q) => (
          <button
            key={q.id}
            onClick={() => selectQuestion(q.id)}
            style={{
              textAlign: 'left',
              minHeight: 48,
              fontSize: 'clamp(16px, 4.5vw, 18px)',
              padding: '10px 14px',
              borderColor: selectedId === q.id ? 'var(--snitch-accent)' : undefined,
            }}
          >
            {q.label}
          </button>
        ))}
      </div>

      {(selectedId === 'GREATER_THAN' || selectedId === 'LOWER_THAN' || selectedId === 'OF_VALUE') && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 18 }}>
            Valor:{' '}
            <select style={selectStyle} value={value} onChange={(e) => setValue(Number(e.target.value) as Rank)}>
              {RANK_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {RANK_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {selectedId === 'BETWEEN' && (
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label style={{ fontSize: 18 }}>
            Mínimo:{' '}
            <select style={selectStyle} value={min} onChange={(e) => setMin(Number(e.target.value) as Rank)}>
              {RANK_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {RANK_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 18 }}>
            Máximo:{' '}
            <select style={selectStyle} value={max} onChange={(e) => setMax(Number(e.target.value) as Rank)}>
              {RANK_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {RANK_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {selectedId === 'OF_SUIT' && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 18 }}>
            Palo:{' '}
            <select style={selectStyle} value={suit} onChange={(e) => setSuit(e.target.value as Suit)}>
              {SUIT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SUIT_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {selectedId && !NO_PARAM_QUESTIONS.includes(selectedId) && (
        <p style={{ fontSize: 16, color: 'var(--snitch-muted)' }}>
          Vista previa: "{questionLabel(buildQuestion()!)}"
        </p>
      )}

      {error && <p style={{ color: 'var(--snitch-accent)', fontSize: 16 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {selectedId && !NO_PARAM_QUESTIONS.includes(selectedId) && (
          <button className="snitch-btn-accent" onClick={handleConfirm} style={{ minHeight: 44 }}>
            Confirmar
          </button>
        )}
        <button onClick={onCancel} style={{ minHeight: 44 }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
