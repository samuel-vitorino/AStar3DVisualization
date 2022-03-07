let local = localStorage.getItem('settings');

if (local === 'undefined'){
    local = null;
}

export let settings = (local ? JSON.parse(local) : null) || {
    carSpeed: 1,
    groundSize: 60
}

export function save(s) {
    localStorage.setItem('settings', JSON.stringify(s));
}
