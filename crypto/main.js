var EncryptionKey = '&F)J@NcRfTjWnZr4u7x!A%D*G-KaPdSg';

function encryptKey() {
    const text = document.querySelector('#dec-in').value;
    document.querySelector('#dec-out').innerHTML = encrypt(text);
}

function decryptKey() {
    const text = document.querySelector('#enc-in').value;
    try {
        document.querySelector('#enc-out').innerHTML = JSON.stringify(
            JSON.parse(decrypt(text)),
            undefined,
            2,
        );
    } catch (error) {
        document.querySelector('#enc-out').innerHTML = decrypt(text);
    }
}

function encrypt(msgString) {
    /**
     * @param msgString:        string to be encrypted via AES
     * @type {*|WordArray|number}
     * @return string value
     */
    // msgString is expected to be Utf8 encoded

    var key = CryptoJS.enc.Utf8.parse(EncryptionKey);
    let iv = CryptoJS.lib.WordArray.random(16);
    let encrypted = CryptoJS.AES.encrypt(msgString, key, {
        iv: iv,
    });
    return iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
}

function decrypt(ciphertextStr) {
    /**
     * @param ciphertextStr:    string to be decrypted via AES
     * @type {*|WordArray}
     * @return JSON object
     */
    let ciphertext = CryptoJS.enc.Base64.parse(ciphertextStr);
    // split IV and ciphertext
    let iv = ciphertext.clone();
    iv.sigBytes = 16;
    iv.clamp();
    ciphertext.words.splice(0, 4); // delete 4 words = 16 bytes
    ciphertext.sigBytes -= 16;
    // decryption
    var key = CryptoJS.enc.Utf8.parse(EncryptionKey);
    let decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
        iv: iv,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

// Queue class
class Queue {
    // Array is used to implement a Queue
    constructor() {
        this.items = [];
    }

    // Functions to be implemented
    // enqueue(item)
    enqueue(element) {
        // adding element to the queue
        this.items.push(element);
        this.printQueue();
    }

    // dequeue()
    dequeue() {
        // removing element from the queue
        // returns underflow when called 
        // on empty queue
        if (this.isEmpty()) {
            return "Underflow";
        }
        return this.items.shift();
    }
    // front()
    front() {
        // returns the Front element of 
        // the queue without removing it.
        if (this.isEmpty()) {
            return "No elements in Queue";
        }
        return this.items[0];
    }

    // isEmpty()
    isEmpty() {
        // return true if the queue is empty.
        return this.items.length == 0;
    }
    // printQueue()
    printQueue() {
        var str = "";
        for (var i = 0; i < this.items.length; i++);
        str += this.items[i] + " ";
        return str;
    }
}

var queue = new Queue();
var counter = 0;

function resetAll() {
    let reset = document.querySelector('#reset-all-btn');
    reset.classList.add('rotating');
    clearText('enc-in', false);
    clearText('dec-in', false);
    clearText('enc-out', false);
    clearText('dec-out', false);
    showSnackbar('clear');
    setTimeout(function () { reset.classList.remove('rotating'); }, 500);
}

function formatText(selector) {
    try {
        var ugly = document.getElementById(selector).value;
        var obj = JSON.parse(ugly);
        var pretty = JSON.stringify(obj, undefined, 4);
        document.getElementById(selector).value = pretty;
        showSnackbar('format');
    } catch (err) {
        // pass
    }
}

function clearText(selector, showSnackbarFlag = true) {
    let ele = document.getElementById(selector);
    if (selector === 'enc-in' || selector === 'dec-in') {
        ele.value = '';
    } else {
        ele.textContent = '';
    }
    if(showSnackbarFlag) {
        showSnackbar('clear');
    }
}

function copy(selector) {
    if (selector === 'enc-in' || selector === 'dec-in') {
        var text = document.getElementById(selector);
        if (text.value === '') {
            document.getElementById(`${selector}-copy-btn`).style.color = 'red';
            showSnackbar('empty');
        } else {
            text.select();
            document.execCommand('copy');
            document.getElementById(`${selector}-copy-btn`).style.color = 'green';
            showSnackbar('copy');
        }
    } else {
        const copyText = document.getElementById(selector).textContent;
        if (copyText === '') {
            document.getElementById(`${selector}-copy-btn`).style.color = 'red';
            showSnackbar('empty');

        } else {
            const textArea = document.createElement('textarea');
            textArea.setAttribute('class', 'hidden-textarea');
            textArea.textContent = copyText;
            document.body.append(textArea);
            textArea.select();
            document.execCommand("copy");
            document.getElementById(`${selector}-copy-btn`).style.color = 'green';
            showSnackbar('copy');
        }
    }
    setTimeout(function () {
        document.getElementById(`${selector}-copy-btn`).style.color = '#121212';
    }, 2500);
}

var timeoutId = [];

async function showSnackbar(text) {
    let snackbarContainer = document.getElementById('snackbar-container');
    let snackbarTemplate = document.getElementById('snackbar-template');
    var snackbarFragment = document.importNode(snackbarTemplate.content, true);
    var snackbar = snackbarFragment.querySelector('div');
    const id = `snackbar-${Date.now()}-${Math.random()}`;
    snackbar.setAttribute('id', id);
    snackbarContainer.appendChild(snackbar);
    queue.enqueue(id);
    counter++;
    if (counter > 5) {
        id_from_queue = queue.front();
        clearTimeout(timeoutId[`${id_from_queue}`]);
        removeSnackbar('counter_remove', id_from_queue);
    }
    if (text === 'empty') {
        snackbar.setAttribute('data-tooltip', 'empty!');
        setTimeout(function () {
            snackbar.setAttribute('class', 'snackbar empty appeared');
        }, 50);
    } else if (text === 'copy') {
        snackbar.setAttribute('data-tooltip', 'copied!');
        setTimeout(function () {
            snackbar.setAttribute('class', 'snackbar copied appeared');
        }, 50);
    } else if (text === 'clear') {
        snackbar.setAttribute('data-tooltip', 'cleared!');
        setTimeout(function () {
            snackbar.setAttribute('class', 'snackbar cleared appeared');
        }, 50);
    } else if (text === 'format') {
        snackbar.setAttribute('data-tooltip', 'formatted!');
        setTimeout(function () {
            snackbar.setAttribute('class', 'snackbar formatted appeared');
        }, 50);
    }
    timeoutId[`${id}`] = setTimeout(function () {
        removeSnackbar('natural_remove', id);
    }, 2500);
}


function removeSnackbar(type, id) {
    try {
        document.getElementById(id).classList.remove('class', 'appeared');
        document.getElementById(id).classList.add('class', 'disappearing');
        const time = type === 'counter_remove' ? 0 : 2500;
        setTimeout(function () {
            counter--;
            queue.dequeue();
            document.getElementById(id).remove();
        }, time);
    } catch (err) {
        // pass
    }
}

let selectOption = 'encrypt';

function toggleOptionOnMobileScreen(option) {
    if (option === 'encrypt') {
        document.querySelector('#encrypt-textarea-input').style.display = 'none';
        document.querySelector('#encrypt-textarea-output').style.display = 'none';
        document.querySelector('#decrypt-textarea-input').style.display = 'flex';
        document.querySelector('#decrypt-textarea-output').style.display = 'flex';
    } else {
        document.querySelector('#encrypt-textarea-input').style.display = 'flex';
        document.querySelector('#encrypt-textarea-output').style.display = 'flex';
        document.querySelector('#decrypt-textarea-input').style.display = 'none';
        document.querySelector('#decrypt-textarea-output').style.display = 'none';
    }
    selectOption = option;
}

window.onresize = () => {
    if (window.matchMedia("(max-width: 600px)").matches) {
        if(selectOption === 'encrypt') {
            document.querySelector('#encrypt-textarea-input').style.display = 'none';
            document.querySelector('#encrypt-textarea-output').style.display = 'none';
            document.querySelector('#decrypt-textarea-input').style.display = 'flex';
            document.querySelector('#decrypt-textarea-output').style.display = 'flex';
        } else {
            document.querySelector('#encrypt-textarea-input').style.display = 'flex';
            document.querySelector('#encrypt-textarea-output').style.display = 'flex';
            document.querySelector('#decrypt-textarea-input').style.display = 'none';
            document.querySelector('#decrypt-textarea-output').style.display = 'none';
        }
    } else {
        document.querySelector('#encrypt-textarea-input').style.display = 'flex';
        document.querySelector('#encrypt-textarea-output').style.display = 'flex';
        document.querySelector('#decrypt-textarea-input').style.display = 'flex';
        document.querySelector('#decrypt-textarea-output').style.display = 'flex';
    }
}