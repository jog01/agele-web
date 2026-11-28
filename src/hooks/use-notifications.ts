"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { env } from "@/env";
import { type AlertSettings, type NotificationUpdate, notificationsApi } from "@/lib/api/notifications";
import { resolveWsUrl } from "@/lib/realtime";

const REFRESH_MS = 30_000;

function playAlert(audio: AudioContext | null) {
  if (audio?.state !== "running") return;
  const note = audio.createOscillator();
  const volume = audio.createGain();
  const start = audio.currentTime;
  note.frequency.value = 660;
  volume.gain.setValueAtTime(0.08, start);
  volume.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
  note.connect(volume).connect(audio.destination);
  note.start(start);
  note.stop(start + 0.25);
}

function useAlertSound(viewer: string | null) {
  const audio = useRef<AudioContext | null>(null);
  const [armedViewer, setArmedViewer] = useState<string | null>(null);

  useEffect(() => {
    if (!viewer) return;
    return () => {
      void audio.current?.close();
      audio.current = null;
    };
  }, [viewer]);

  async function enableSound() {
    if (!viewer || !window.AudioContext) return false;
    try {
      const context = audio.current ?? new AudioContext();
      audio.current = context;
      await context.resume();
      if (audio.current !== context) return false;
      setArmedViewer(viewer);
      return true;
    } catch {
      return false;
    }
  }

  return { audio, enableSound, soundArmed: !!viewer && armedViewer === viewer && audio.current !== null };
}

function usePrivateInbox(
  id: string | undefined,
  viewer: string | null,
  getAccessToken: () => Promise<string | null>,
  audio: ReturnType<typeof useAlertSound>["audio"],
) {
  const client = useQueryClient();

  useEffect(() => {
    if (!id || !viewer) return;
    const topic = `user:${id}:alerts`;
    const invalidate = (key: "list" | "settings") =>
      void client.invalidateQueries({ queryKey: ["notifications", viewer, key] });
    let active = true;
    let socket: WebSocket;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    function connect() {
      const ws = new WebSocket(resolveWsUrl(env.NEXT_PUBLIC_WS_URL, window.location));
      socket = ws;
      let subscribed = false;
      ws.onopen = () => {
        void getAccessToken()
          .then((token) => {
            if (!active || ws.readyState !== WebSocket.OPEN) return;
            if (token) ws.send(JSON.stringify({ op: "authenticate", token }));
            else ws.close();
          })
          .catch(() => ws.close());
      };
      ws.onmessage = (message) => {
        if (!active) return;
        try {
          const frame = JSON.parse(String(message.data)) as {
            type?: string;
            topic?: string;
            data?: NotificationUpdate;
          };
          if (frame.type === "authenticated") {
            ws.send(JSON.stringify({ op: "subscribe", topic }));
          } else if (frame.type === "subscribed" && frame.topic === topic) {
            subscribed = true;
            attempt = 0;
            invalidate("list");
            invalidate("settings");
          } else if (subscribed && frame.type === "event" && frame.topic === topic) {
            if (frame.data?.kind === "settings") invalidate("settings");
            else if (frame.data?.kind === "inbox") {
              invalidate("list");
              if (frame.data.sound === true) playAlert(audio.current);
            }
          } else if (!subscribed && frame.type === "error") {
            ws.close();
          }
        } catch {
          // Ignore malformed events. REST refresh remains available.
        }
      };
      ws.onclose = () => {
        if (active) retry = setTimeout(connect, Math.min(30_000, 500 * 2 ** attempt++));
      };
    }

    connect();
    return () => {
      active = false;
      clearTimeout(retry);
      socket.close();
    };
  }, [id, viewer, getAccessToken, client, audio]);
}

export function useNotifications(open: boolean) {
  const auth = useAuth();
  const client = useQueryClient();
  const account = auth.authenticated ? (auth.walletAddress ?? auth.userLabel) : null;
  const viewer = account ? `account:${account}` : !auth.configured ? "demo" : null;
  const enabled = auth.ready && viewer !== null;
  const settingsKey = ["notifications", viewer, "settings"] as const;

  const me = useQuery({
    queryKey: ["notifications", viewer, "viewer"],
    queryFn: ({ signal }) => notificationsApi.viewer(auth, signal),
    enabled: auth.ready && !!account,
    staleTime: Infinity,
  });
  const list = useInfiniteQuery({
    queryKey: ["notifications", viewer, "list"],
    queryFn: ({ pageParam, signal }) => notificationsApi.list(auth, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: ({ nextCursor }) => nextCursor ?? undefined,
    enabled: enabled && open,
    refetchInterval: open ? REFRESH_MS : false,
    refetchOnWindowFocus: true,
  });
  const settings = useQuery({
    queryKey: settingsKey,
    queryFn: ({ signal }) => notificationsApi.settings(auth, signal),
    enabled: auth.ready && !!account && open,
    refetchOnWindowFocus: true,
  });
  const saveSettings = useMutation({
    mutationFn: (value: AlertSettings) => notificationsApi.saveSettings(auth, value),
    async onSuccess(value) {
      await client.cancelQueries({ queryKey: settingsKey });
      client.setQueryData(settingsKey, value);
      void client.invalidateQueries({ queryKey: settingsKey });
    },
  });
  const sound = useAlertSound(viewer);
  usePrivateInbox(auth.authenticated ? me.data?.id : undefined, viewer, auth.getAccessToken, sound.audio);

  return { auth, enabled, list, settings, saveSettings, ...sound };
}
