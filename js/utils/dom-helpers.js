// DOM Utility Functions

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked.
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Creates a throttled function that only invokes the provided function at most once
 * per every specified wait milliseconds.
 * @param {Function} func - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle invocations to
 * @returns {Function} - The throttled function
 */
export function throttle(func, wait) {
    let lastCall = 0;
    
    return function executedFunction(...args) {
        const now = Date.now();
        
        if (now - lastCall >= wait) {
            func(...args);
            lastCall = now;
        }
    };
}

/**
 * Creates and returns an HTML element with the specified attributes and children
 * @param {string} tag - The HTML tag name
 * @param {Object} attributes - The attributes to set on the element
 * @param {Array|string|HTMLElement} children - The children to append to the element
 * @returns {HTMLElement} - The created element
 */
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.entries(value).forEach(([prop, val]) => {
                element.style[prop] = val;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.substring(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Append children
    if (children) {
        if (!Array.isArray(children)) {
            children = [children];
        }
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        });
    }
    
    return element;
}

/**
 * Removes all child nodes from an element
 * @param {HTMLElement} element - The element to clear
 */
export function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Checks if an element is currently in the viewport
 * @param {HTMLElement} element - The element to check
 * @param {number} offset - Optional offset from the edges of the viewport
 * @returns {boolean} - True if the element is in the viewport
 */
export function isInViewport(element, offset = 0) {
    const rect = element.getBoundingClientRect();
    
    return (
        rect.top >= 0 - offset &&
        rect.left >= 0 - offset &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) + offset
    );
}

/**
 * Creates a simple event emitter
 * @returns {Object} - An event emitter object with on, off, and emit methods
 */
export function createEventEmitter() {
    const events = {};
    
    return {
        on(event, listener) {
            if (!events[event]) {
                events[event] = [];
            }
            events[event].push(listener);
            return () => this.off(event, listener);
        },
        off(event, listener) {
            if (!events[event]) return;
            events[event] = events[event].filter(l => l !== listener);
        },
        emit(event, ...args) {
            if (!events[event]) return;
            events[event].forEach(listener => listener(...args));
        }
    };
}

/**
 * Gets the current URL query parameters as an object
 * @returns {Object} - The query parameters as key-value pairs
 */
export function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    
    if (!queryString) return params;
    
    const pairs = queryString.split('&');
    
    for (const pair of pairs) {
        const [key, value] = pair.split('=');
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
    
    return params;
}

/**
 * Formats a number with thousands separators
 * @param {number} number - The number to format
 * @returns {string} - The formatted number
 */
export function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}