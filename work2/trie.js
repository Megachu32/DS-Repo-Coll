// trie.js

// Helper: Sleep function for animations
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Logger (We need to reference the global logger or pass it in)
// For simplicity, we assume logger is globally available or we pass callbacks.
// Better approach: Pass logger action in the methods, but to keep your structure:
const log = (text) => {
    const area = document.getElementById('log-area');
    if(area) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `> ${text}`;
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    }
};

export class TrieNode {
    constructor(char = '*') {
        this.children = new Array(26).fill(null);
        this.isLeaf = false;
        this.char = char; 
        this.x = 0;
        this.y = 0;
        this.id = Math.random().toString(36).substr(2, 9);
    }
}

export class Trie {
    constructor(visualizer) {
        this.root = new TrieNode('*');
        this.vis = visualizer;
        this.vis.draw(this.root);
    }

    // Insert
    async insert(key) {
        key = key.toLowerCase();
        if (!/^[a-z]+$/.test(key)) {
            log("Error: Trie hanya menerima huruf a-z.");
            return;
        }

        log(`Insert kata "${key}" ke Trie...`);
        let curr = this.root;
        await this.vis.highlight(curr);

        for (let c of key) {
            let index = c.charCodeAt(0) - "a".charCodeAt(0);
            
            if (curr.children[index] === null) {
                log(`Buat node baru untuk '${c}'`);
                curr.children[index] = new TrieNode(c);
                this.vis.draw(this.root); 
                await sleep(400); 
            }
            curr = curr.children[index];
            await this.vis.highlight(curr);
        }
        
        if (!curr.isLeaf) {
            curr.isLeaf = true;
            log(`Tandai '${curr.char}' sebagai akhir kata.`);
            this.vis.draw(this.root); 
            await this.vis.highlight(curr, 'found');
        } else {
            log(`Kata "${key}" sudah ada sebelumnya.`);
        }
    }

    // Lookup
    async lookup(key) {
        key = key.toLowerCase();
        log(`Mencari "${key}"...`);
        this.vis.clearHighlights();
        
        let curr = this.root;
        await this.vis.highlight(curr);

        for (let c of key) {
            let index = c.charCodeAt(0) - "a".charCodeAt(0);
            if (curr.children[index] === null) {
                log(`Jalur '${c}' putus. Kata tidak ditemukan.`);
                return false;
            }
            curr = curr.children[index];
            await this.vis.highlight(curr);
        }
        
        if (curr.isLeaf) {
            log(`DITEMUKAN: Kata "${key}" ada dalam Trie.`);
            await this.vis.highlight(curr, 'found');
            return true;
        } else {
            log(`Prefix "${key}" ada, tapi bukan kata lengkap (bukan leaf).`);
            return false;
        }
    }

    // Delete
    async delete(key) {
        key = key.toLowerCase();
        log(`Menghapus "${key}"...`);
        if(await this._delete(this.root, key, 0)) {
            log(`Penghapusan "${key}" selesai.`);
            this.vis.draw(this.root);
        }
    }

    async _delete(node, key, depth) {
        const isEmpty = (n) => {
            for (let i = 0; i < 26; i++) {
                if (n.children[i]) return false;
            }
            return true;
        };

        if (!node) return null;

        if (depth === key.length) {
            if (node.isLeaf) {
                node.isLeaf = false; 
                log(`Hapus penanda akhir kata di node '${node.char}'.`);
                if (isEmpty(node)) return null; 
                return node;
            }
            log(`Kata "${key}" tidak ditemukan sebagai kata lengkap.`);
            return node;
        }

        let index = key.charCodeAt(depth) - "a".charCodeAt(0);
        let child = node.children[index];
        
        if (!child) return node;
        
        await this.vis.highlight(node);
        node.children[index] = await this._delete(child, key, depth + 1);

        if (isEmpty(node) && !node.isLeaf && depth > 0) { 
            return null;
        }

        return node;
    }
}