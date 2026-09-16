import { io } from "socket.io-client";

// Same-origin connection: works with the Vite dev proxy and with the
// production build (served directly by the Express server).
export const socket = io({ autoConnect: true });

/** Promise wrapper around a socket.io ack-style emit. */
export function request(event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res) => {
      if (res?.ok) resolve(res);
      else reject(new Error(res?.error || "Сталася помилка"));
    });
  });
}
