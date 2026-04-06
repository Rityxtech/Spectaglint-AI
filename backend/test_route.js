const fs = require('fs');
const FormData = require('form-data');

async function test() {
    try {
        fs.writeFileSync('test.wav', 'dummy content audio');
        const form = new FormData();
        form.append('audioFile', fs.createReadStream('test.wav'));
        form.append('mode', 'FILE_TRANSCRIPTION');

        console.log('Posting...');
        const res = await fetch('https://spectaglint-ai-production.up.railway.app/process/audio', {
            method: 'POST',
            headers: form.getHeaders(),
            body: form
        });
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Data:', text);
    } catch (e) {
        console.log(e.message);
    }
}
test();
