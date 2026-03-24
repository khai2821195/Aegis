import { useState, useCallback } from 'react';
import type { Settings, Provider, PersonaModel, Persona } from '../types';
import { DEFAULT_PERSONAS } from '../config/personas';

const STORAGE_KEY = 'ai-meeting-settings-v2';

const defaultSettings = (): Settings => ({
  apiKeys: { gemini: '', anthropic: '', openai: '' },
  personaModels: Object.fromEntries(
    DEFAULT_PERSONAS.map(p => [p.id, { provider: 'gemini' as Provider, modelId: 'gemini-3.1-flash-lite-preview' }])
  ),
  personas: DEFAULT_PERSONAS,
  attendeeIds: ['cheryl', 'bill'],
});

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const def = defaultSettings();
      return {
        ...def,
        ...parsed,
        personas: parsed.personas?.length ? parsed.personas : def.personas,
        attendeeIds: parsed.attendeeIds ?? def.attendeeIds,
      };
    }
  } catch {}
  return defaultSettings();
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setApiKey = useCallback((provider: Provider, key: string) => {
    setSettings(prev => {
      const next = { ...prev, apiKeys: { ...prev.apiKeys, [provider]: key } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setPersonaModel = useCallback((personaId: string, model: PersonaModel) => {
    setSettings(prev => {
      const next = { ...prev, personaModels: { ...prev.personaModels, [personaId]: model } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleAttendee = useCallback((personaId: string) => {
    setSettings(prev => {
      const ids = prev.attendeeIds;
      const isIn = ids.includes(personaId);
      let next: string[];
      if (isIn) {
        next = ids.filter(id => id !== personaId);
      } else {
        if (ids.length >= 10) return prev; // max 10
        next = [...ids, personaId];
      }
      const updated = { ...prev, attendeeIds: next };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const MAX_PERSONAS = 20;

  const savePersona = useCallback((persona: Persona) => {
    setSettings(prev => {
      const exists = prev.personas.find(p => p.id === persona.id);
      if (!exists && prev.personas.length >= MAX_PERSONAS) return prev;
      const personas = exists
        ? prev.personas.map(p => p.id === persona.id ? persona : p)
        : [...prev.personas, persona];
      const personaModels = prev.personaModels[persona.id]
        ? prev.personaModels
        : { ...prev.personaModels, [persona.id]: { provider: 'gemini' as Provider, modelId: 'gemini-3.1-flash-lite-preview' } };
      const next = { ...prev, personas, personaModels };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deletePersona = useCallback((personaId: string) => {
    setSettings(prev => {
      const personas = prev.personas.filter(p => p.id !== personaId);
      const attendeeIds = prev.attendeeIds.filter(id => id !== personaId);
      const next = { ...prev, personas, attendeeIds };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, persist, setApiKey, setPersonaModel, toggleAttendee, savePersona, deletePersona };
}
