const NativeResizeObserver = (typeof window !== 'undefined' && 'ResizeObserver' in window) ? 
    window.ResizeObserver : 
    require('@juggle/resize-observer').ResizeObserver

/**
 * Safe ResizeObserver wrapper that defers notifications to requestAnimationFrame.
 * This completely prevents "ResizeObserver loop completed with undelivered notifications"
 * and "ResizeObserver loop limit exceeded" warnings in modern browsers.
 */
class SafeResizeObserver {
    constructor(callback) {
        this._observer = new NativeResizeObserver((entries, observer) => {
            if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                window.requestAnimationFrame(() => {
                    try {
                        callback(entries, observer)
                    } catch (e) {}
                })
            } else {
                try {
                    callback(entries, observer)
                } catch (e) {}
            }
        })
    }

    observe(target, options) {
        if (this._observer && target) {
            this._observer.observe(target, options)
        }
    }

    unobserve(target) {
        if (this._observer && target) {
            this._observer.unobserve(target)
        }
    }

    disconnect() {
        if (this._observer) {
            this._observer.disconnect()
        }
    }
}

export { SafeResizeObserver as ResizeObserver }