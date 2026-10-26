"use client";

import { Megaphone, Search } from "lucide-react";
import { useState } from "react";

import { StudentStatusPill } from "@/components/domain/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { buildAnnouncement } from "@/lib/domain/announcements";

import { useSpeech } from "./use-speech";

export type CallableStudent = {
  id: string;
  name: string;
  group: string;
  status: string;
  avatarTone: string;
  tutorName: string;
};

/**
 * Voceo manual de un alumno.
 *
 * Complementa al voceo automático del escáner para los casos en que la familia
 * ya está identificada pero no se ha escaneado nada (una llamada telefónica, un
 * retraso, una salida anticipada autorizada por dirección).
 *
 * No registra ningún movimiento: vocear no es entregar. La salida sigue
 * exigiendo la validación del escáner o el registro manual.
 */
export function CallStudentPanel({ students }: { students: CallableStudent[] }) {
  const { speak, muted } = useSpeech();
  const [search, setSearch] = useState("");
  const [lastCalled, setLastCalled] = useState<string | null>(null);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? students.filter((student) =>
        `${student.name} ${student.group} ${student.tutorName}`.toLowerCase().includes(term),
      )
    : students;

  const call = (student: CallableStudent) => {
    const text = buildAnnouncement({
      students: [{ name: student.name, group: student.group }],
      personName: student.tutorName,
      relationship: null,
    });
    speak(text);
    setLastCalled(text);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar alumno, grupo o tutor…"
          className="h-11 py-0 pl-10"
          aria-label="Buscar alumno para vocear"
        />
      </div>

      {lastCalled ? (
        <p className="rounded-2xl bg-ink-900 px-3.5 py-2.5 text-xs font-medium leading-snug text-white">
          <span className="font-bold uppercase tracking-wider text-white/60">Último voceo · </span>
          {lastCalled}
          {muted ? (
            <span className="mt-1 block text-white/60">
              El voceo está silenciado en este dispositivo: el aviso solo se muestra en pantalla.
            </span>
          ) : null}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No hay alumnos que vocear"
          description="Solo se pueden vocear alumnos que estén en el plantel."
        />
      ) : (
        <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-0.5">
          {filtered.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => call(student)}
                className="flex w-full items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
              >
                <Avatar name={student.name} tone={student.avatarTone} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    {student.name}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {student.group} · Tutor: {student.tutorName}
                  </span>
                </span>
                <StudentStatusPill status={student.status} size="sm" />
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-900 text-white">
                  <Megaphone className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
