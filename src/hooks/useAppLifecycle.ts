import { useEffect, useRef } from "react";
import { type AuthUser, type GameScreen, useGameStore, type WeatherType } from "../store";
import { api } from "../lib/api";
import { AudioSystem } from "../lib/audio";
import { syncOnLogin, pushUserState } from "../lib/cloudSync";
import {
  connectSocket,
  onFriendRequest,
  onIslandVisitData,
  onIslandVisitError,
  onUserOffline,
  onUserOnline,
} from "../lib/socket";
import { applyIslandSnapshot, showTitleBackdrop } from "../utils/islandIO";
import { TRACKS } from "../components/ui/musicData";

export function useRestoreTitleBackground() {
  useEffect(() => {
    // 开屏背景永远展示预置岛 preset-demo（与玩家存档/登录解耦）
    showTitleBackdrop().catch(() => {});
  }, []);
}

export function useGiftClaimQuery(setGiftClaimId: (giftId: string | null) => void) {
  useEffect(() => {
    const giftId = new URLSearchParams(location.search).get("gift");
    if (!giftId) return;
    setGiftClaimId(giftId);
  }, [setGiftClaimId]);
}

export function useAuthBootstrap(authUser: AuthUser | null, setAuthUser: (user: AuthUser | null) => void) {
  useEffect(() => {
    const token = api.getToken();
    if (token && !authUser) {
      api
        .getMe()
        .then(async (res) => {
          if (api.getToken() !== token) return;
          setAuthUser(res.user);
          connectSocket(token);
          await syncOnLogin();
          // 标题背景保持预置岛展示（不被玩家自己的岛覆盖）
          await showTitleBackdrop();
        })
        .catch(() => {
          api.setToken(null);
        });
    }
  }, [authUser, setAuthUser]);
}

export function usePresenceAndVisitEvents(
  authUser: AuthUser | null,
  addToast: (message: string, type?: "online" | "offline" | "friend_request" | "info") => void,
  setVisitingIsland: (island: any) => void,
) {
  useEffect(() => {
    if (!authUser) return;

    const unsubOnline = onUserOnline((data: any) => {
      addToast(`${data.username} 上线了`, "online");
    });
    const unsubOffline = onUserOffline((data: any) => {
      addToast(`${data.username} 离开了`, "offline");
    });
    const unsubFriendReq = onFriendRequest((data: any) => {
      addToast(`${data.fromName} 请求添加你为好友`, "friend_request");
    });
    const unsubVisitData = onIslandVisitData((data: any) => {
      setVisitingIsland({
        islandId: data.islandId,
        islandName: data.islandName,
        ownerName: data.ownerName,
        data: data.data,
      });
      try {
        applyIslandSnapshot(data.data || {});
      } catch {
        // Ignore malformed remote snapshots and keep the local island intact.
      }
    });
    const unsubVisitError = onIslandVisitError((data: any) => {
      addToast(data.error || "串门失败", "info");
    });

    return () => {
      unsubOnline();
      unsubOffline();
      unsubFriendReq();
      unsubVisitData();
      unsubVisitError();
    };
  }, [authUser, addToast, setVisitingIsland]);
}

export function useEcologyAudioSync(springCount: number, windmillCount: number, weather: WeatherType) {
  useEffect(() => {
    AudioSystem.updateEcologyState(springCount, windmillCount, weather);
  }, [springCount, windmillCount, weather]);
}

export function useAutosave(saveGame: () => void) {
  useEffect(() => {
    const interval = setInterval(() => {
      saveGame();
    }, 30000);
    return () => clearInterval(interval);
  }, [saveGame]);
}

export function useUnreadCountPolling(
  authUser: AuthUser | null,
  screen: GameScreen,
  setUnreadCount: (count: number) => void,
) {
  useEffect(() => {
    if (!authUser || screen !== "PLAYING") return;

    const fetchUnread = async () => {
      try {
        const res = await api.getUnreadCount();
        const total = res.unread?.reduce((sum: number, u: any) => sum + (u.count || 0), 0) || 0;
        setUnreadCount(total);
      } catch {
        // Best-effort polling only.
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [authUser, screen, setUnreadCount]);
}

export function useCloudIslandSync(authUser: AuthUser | null, islandId: string | null) {
  useEffect(() => {
    if (!authUser || !islandId) return;

    const syncInterval = setInterval(() => {
      const state = useGameStore.getState();
      if (state.authUser && state.islandId) {
        const serverId = state.serverIslandMap[state.islandId];
        if (serverId) {
          const saveData = {
            timeOfDay: state.timeOfDay,
            weather: state.weather,
            assets: state.assets,
            grassHealth: state.grassHealth,
            deerCount: state.deerCount,
            wolfCount: state.wolfCount,
            ecoPoints: state.ecoPoints,
            stats: state.stats,
          };
          api.updateIsland(serverId, { data: saveData }).catch(() => {});
        }
        pushUserState();
      }
    }, 60000);

    return () => clearInterval(syncInterval);
  }, [authUser, islandId]);
}

export function useAudioBootstrap(appLoaded: boolean) {
  useEffect(() => {
    if (!appLoaded) return;

    const initAudio = async () => {
      AudioSystem.init();
      // 兜底设置播放列表：不再依赖 LoadingScreen 的异步加载流程跑完，
      // 否则进游戏时列表可能为空，自动切歌直接卡住。
      AudioSystem.setPlaylist(TRACKS.map((t) => t.url));
      await AudioSystem.loadBGM("/Tides_of_Mahogany.mp3");
      AudioSystem.playBGM();
    };
    initAudio();

    const opts: AddEventListenerOptions = { capture: true };
    const events = ["pointerdown", "click", "touchstart", "keydown"] as const;
    const removeUnlock = () => events.forEach((e) => window.removeEventListener(e, unlock, opts));
    const unlock = () => {
      AudioSystem.ensureResumed();
      setTimeout(() => {
        if (AudioSystem.isBGMActuallyPlaying()) removeUnlock();
      }, 250);
    };
    events.forEach((e) => window.addEventListener(e, unlock, opts));
    return removeUnlock;
  }, [appLoaded]);
}

export function useScreenBgm(screen: GameScreen) {
  useEffect(() => {
    if (screen === "PLAYING") {
      AudioSystem.switchBGM("/Glockenspiel_Sunprint.mp3");
    } else if (screen === "TITLE" || screen === "LOGIN" || screen === "ONBOARD" || screen === "SAVE_SELECT") {
      AudioSystem.switchBGM("/Tides_of_Mahogany.mp3");
    }
  }, [screen]);
}

export function useAutoFullscreen(screen: GameScreen) {
  useEffect(() => {
    if (screen !== "PLAYING") return;
    if (document.fullscreenElement) return;

    const goFullscreen = () => {
      const el = document.documentElement as any;
      if (!document.fullscreenElement) {
        try {
          el.requestFullscreen?.()?.catch?.(() => {});
          el.webkitRequestFullscreen?.();
        } catch {
          // Ignore browsers that reject fullscreen.
        }
      }
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener("pointerdown", goFullscreen);
      window.removeEventListener("keydown", goFullscreen);
    };

    window.addEventListener("pointerdown", goFullscreen);
    window.addEventListener("keydown", goFullscreen);
    return cleanup;
  }, [screen]);
}

export function useUndoRedoHotkeys(screen: GameScreen) {
  useEffect(() => {
    if (screen !== "PLAYING") return;

    const handleKeydown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useGameStore.getState().redo();
        else useGameStore.getState().undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useGameStore.getState().redo();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [screen]);
}

export function usePlaytimeLoop(screen: GameScreen, incrementPlaytime: (delta: number) => void) {
  useEffect(() => {
    if (screen !== "PLAYING") return;
    const interval = setInterval(() => {
      incrementPlaytime(1);
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, incrementPlaytime]);
}

export function useEcologyLoop(updateEcology: () => void) {
  useEffect(() => {
    const interval = setInterval(() => {
      updateEcology();
    }, 2000);
    return () => clearInterval(interval);
  }, [updateEcology]);
}

export function useRuinsAwakening(screen: GameScreen) {
  const ruinsTriggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (screen !== "PLAYING") return;

    const near = (a: any, b: any, radius: number) => {
      const dx = a.position.x - b.position.x;
      const dz = a.position.z - b.position.z;
      return dx * dx + dz * dz < radius * radius;
    };

    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const springs = state.assets.filter((asset) => asset.type === "spring");
      if (!springs.length) return;

      const trees = state.assets.filter(
        (asset) => asset.type === "treeA" || asset.type === "treeB" || asset.type === "pine_tree",
      );
      const ruins = state.assets.filter((asset) => asset.type === "ruins_arch");

      for (const spring of springs) {
        if (ruinsTriggeredRef.current.has(spring.id)) continue;
        if (ruins.some((ruin) => near(ruin, spring, 7))) {
          ruinsTriggeredRef.current.add(spring.id);
          continue;
        }
        if (trees.filter((tree) => near(tree, spring, 7)).length >= 4) {
          ruinsTriggeredRef.current.add(spring.id);
          const position = { x: spring.position.x, y: 0, z: spring.position.z };
          state.spawnVFX("splash", position);
          state.addAsset({
            type: "ruins_arch",
            position,
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1.4,
            customState: `rising:${Date.now()}`,
          });
          AudioSystem.playSynergyChord();
          state.bumpAwakening(5);
          state.addToast("遗迹破水而出！泉底古老的共鸣被唤醒了", "info");
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [screen]);
}
