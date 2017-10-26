// vim: ts=4:sw=4:expandtab
/* global  */

(function() {
    'use strict';

    self.F = self.F || {};

    const scope = F.urls.main + '/';

    F.ServiceWorkerManager = class ServiceWorkerManager {

        constructor() {
            this._listeners = {};
        }

        addEventListener(event, callback) {
            if (!this._listeners[event]) {
                this._listeners[event] = [callback];
            } else {
                this._listeners[event].push(callback);
            }
        }

        removeEventListener(event, callback) {
            this._listeners[event] = this._listeners[event].filter(x => x !== callback);
        }

        async triggerEvent(event) {
            const callbacks = this._listeners[event];
            if (!callbacks || !callbacks.length) {
                return;
            }
            const args = Array.from(arguments);
            args.shift();
            for (const callback of callbacks) {
                try {
                    await callback.apply(this, args);
                } catch(e) {
                    console.error("ServiceWorkerManager trigger event error:", e);
                } 
            }
        }

        async start() {
            const sw = navigator.serviceWorker;
            sw.addEventListener('controllerchange', this.onControllerChange.bind(this));
            sw.addEventListener('message', this.onControllerMessage.bind(this));
            const url = `${F.urls.worker_service}?id=${F.currentUser.id}`;
            let reg;
            for (const x of await navigator.serviceWorker.getRegistrations()) {
                if ((new URL(x.scope)).pathname !== scope) {
                    console.warn("Unregistering deprecated service worker:", x.scope);
                    x.unregister();
                } else {
                    reg = x;
                }
            }
            if (!reg) {
                reg = await navigator.serviceWorker.register(url, {scope});
            }
            reg.addEventListener('updatefound', ev => this.bindReg(ev.target));
            await this.bindReg(reg);
            F.util.sleep(75).then(reg.update.bind(reg));
        }

        async onControllerChange(ev) {
            /* TODO Probably reset state and restart fbm here... */
            console.warn('Unhandled ServiceWorker change');
        }

        async onControllerMessage(ev) {
            const msg = ev.data;
            if (msg.op === 'openThread') {
                await F.mainView.openThreadById(msg.data.threadId);
            }
        }

        async bindReg(reg) {
            if (this._reg === reg) {
                return;
            }
            this._reg = reg;
            await this.triggerEvent('bindregistration', reg);
        }

        getRegistration() {
            return this._reg;
        }
    };
})();
