import { useState } from 'react';
import { updateFavoriteCards } from '../firebase/profile';
import { isRedSuit } from '../game/display';
import { SuitIcon } from './SuitIcon';
import { CardSlot } from './CardSlot';
import { RANK_LABELS, SUIT_LABELS } from '../game/askQuestions';
import type { Card, Rank, Suit } from '../game/types';
import { cardId } from '../game/types';

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANK_ORDER: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function FavoriteHandPicker({
  uid,
  initialCards,
  onClose,
  onSaved,
}: {
  uid: string;
  initialCards: Card[];
  onClose: () => void;
  onSaved: (cards: Card[]) => void;
}) {
  const [cards, setCards] = useState<(Card | null)[]>(() => {
    const padded: (Card | null)[] = [...initialCards];
    while (padded.length < 3) padded.push(null);
    return padded.slice(0, 3);
  });
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [chooserSuit, setChooserSuit] = useState<Suit | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSlot(i: number) {
    setEditingSlot(i);
    setChooserSuit(null);
    setError(null);
  }

  function pickJoker() {
    if (editingSlot === null) return;
    const next = [...cards];
    next[editingSlot] = { kind: 'joker' };
    setCards(next);
    setEditingSlot(null);
  }

  function pickRank(rank: Rank) {
    if (editingSlot === null || !chooserSuit) return;
    const next = [...cards];
    next[editingSlot] = { kind: 'standard', suit: chooserSuit, rank };
    setCards(next);
    setEditingSlot(null);
    setChooserSuit(null);
  }

  async function handleSave() {
    setError(null);
    const filled = cards.filter((c): c is Card => c !== null);
    if (filled.length !== 3) {
      setError('Elegí las 3 cartas antes de guardar.');
      return;
    }
    const standardIds = filled.filter((c) => c.kind === 'standard').map(cardId);
    if (new Set(standardIds).size !== standardIds.length) {
      setError('No podés repetir la misma carta dos veces (los Jokers sí se pueden repetir, hay 2 en el mazo).');
      return;
    }
    const jokerCount = filled.filter((c) => c.kind === 'joker').length;
    if (jokerCount > 2) {
      setError('Como mucho podés elegir 2 Jokers — son los únicos que existen en el mazo.');
      return;
    }
    setSaving(true);
    try {
      await updateFavoriteCards(uid, filled);
      onSaved(filled);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={editingSlot === null ? onClose : undefined}
    >
      <div
        className="snitch-panel-enter"
        style={{
          background: 'var(--snitch-bg)',
          border: '2px solid var(--snitch-fg)',
          padding: 20,
          maxWidth: 380,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {editingSlot === null ? (
          <>
            <p style={{ fontFamily: 'var(--snitch-font-display)', fontSize: 16, margin: '0 0 6px' }}>
              MANO FAVORITA
            </p>
            

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              {cards.map((card, i) => (
                <button
                  key={i}
                  onClick={() => openSlot(i)}
                  style={{ padding: 0, border: 'none', background: 'transparent' }}
                  aria-label={card ? `Cambiar carta ${i + 1}` : `Elegir carta ${i + 1}`}
                >
                  {card ? (
                    <CardSlot state={{ kind: 'faceup', card }} size={56} />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56 * (48 / 34),
                        border: '2px dashed var(--snitch-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--snitch-muted)',
                        fontSize: 28,
                      }}
                    >
                      +
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button className="snitch-btn-accent" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'GUARDAR'}
            </button>
            <button onClick={onClose} disabled={saving} style={{ marginTop: 10, fontSize: 13, color: 'var(--snitch-muted)', display: 'block', marginInline: 'auto' }}>
              Cancelar
            </button>

            {error && <p style={{ color: 'var(--snitch-accent)', marginTop: 14, fontSize: 13 }}>{error}</p>}
          </>
        ) : chooserSuit === null ? (
          <>
            <p style={{ fontSize: 'clamp(16px, 4.5vw, 18px)', margin: '0 0 12px' }}>
              Carta {editingSlot + 1} — elegí el palo:
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
              {SUIT_ORDER.map((suit) => {
                const color = isRedSuit(suit) ? 'var(--snitch-accent)' : 'var(--snitch-fg)';
                return (
                  <button
                    key={suit}
                    onClick={() => setChooserSuit(suit)}
                    aria-label={SUIT_LABELS[suit]}
                    style={{ minWidth: 64, minHeight: 64, fontSize: 32, flex: '1 1 64px' }}
                  >
                    <SuitIcon suit={suit} color={color} size={32} />
                  </button>
                );
              })}
            </div>
            <button onClick={pickJoker} style={{ marginBottom: 10 }}>
              O elegir JOKER
            </button>
            <button onClick={() => setEditingSlot(null)} style={{ display: 'block', marginInline: 'auto', fontSize: 13, color: 'var(--snitch-muted)' }}>
              Volver
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 'clamp(16px, 4.5vw, 18px)', margin: '0 0 12px' }}>
              Carta {editingSlot + 1} de {SUIT_LABELS[chooserSuit]} — elegí el valor:
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
              {RANK_ORDER.map((rank) => (
                <button
                  key={rank}
                  onClick={() => pickRank(rank)}
                  style={{
                    background: 'var(--snitch-card-paper)',
                    borderColor: 'var(--snitch-card-ink)',
                    color: 'var(--snitch-card-ink)',
                    minWidth: 42,
                    minHeight: 44,
                    fontSize: 16,
                  }}
                >
                  {RANK_LABELS[rank]}
                </button>
              ))}
            </div>
            <button onClick={() => setChooserSuit(null)} style={{ display: 'block', marginInline: 'auto', fontSize: 13, color: 'var(--snitch-muted)' }}>
              Volver
            </button>
          </>
        )}
      </div>
    </div>
  );
}
