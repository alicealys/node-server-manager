window.addEventListener('load', () => {
    document.querySelectorAll('*[data-allow]').forEach(allow => {
        allow.addEventListener('click', async (e) => {
            await makeRequest('GET', `/api/authenticator?action=allow&session=${e.target.getAttribute('data-allow')}`)
            window.location.reload()
        })
    })
    document.querySelectorAll('*[data-kick]').forEach(kick => {
        kick.addEventListener('click', async (e) => {
            await makeRequest('GET', `/api/authenticator?action=kick&session=${e.target.getAttribute('data-kick')}`)
        })
    })
})