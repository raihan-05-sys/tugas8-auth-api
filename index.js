const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Supaya API bisa membaca input data berbentuk JSON

// Konfigurasi Koneksi Database MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Nurseto123', // Ini password MySQL kamu yang tadi
    database: 'toko_komputer'
});

// Melakukan Tes Koneksi ke Database
db.connect((err) => {
    if (err) {
        console.error('Gagal terhubung ke database:', err.message);
        return;
    }
    console.log('✅ Berhasil terhubung ke database MySQL toko_komputer!');
});

// Endpoint Halaman Depan (Tes API)
app.get('/', (req, res) => {
    res.send('Selamat datang di API Toko Komputer 🚀');
});

// ==========================================
// API ENDPOINT UNTUK LOGIN (TUGAS 8)
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Cek ke database apakah username dan password cocok
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        // Jika data ditemukan (username & password benar)
        if (results.length > 0) {
            // Buatkan "Karcis Token"
            const token = jwt.sign(
                { id: results[0].id, username: username }, 
                'kunci_rahasia_raihan', // Kunci gembok rahasiamu
                { expiresIn: '1h' }     // Token hangus dalam 1 jam
            );

            res.json({
                pesan: "Login Berhasil!",
                token: token
            });
        } else {
            // Jika salah
            res.status(401).json({ pesan: "Gagal: Username atau Password salah!" });
        }
    });
});
// ==========================================

// ==========================================
// MIDDLEWARE "SATPAM" (TUGAS 8)
// ==========================================
const satpamToken = (req, res, next) => {
    // Ambil token dari header Postman yang dikirim user
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formatnya harus: "Bearer <token>"

    // Jika user tidak bawa token sama sekali
    if (!token) {
        return res.status(401).json({ pesan: "Akses Ditolak: Anda belum login (Token tidak ada)!" });
    }

    // Jika bawa token, cek apakah tokennya asli buatan sistem kita
    jwt.verify(token, 'kunci_rahasia_raihan', (err, user) => {
        if (err) return res.status(403).json({ pesan: "Akses Ditolak: Token palsu atau sudah kadaluarsa!" });
        
        req.user = user;
        next(); // Karcis valid, silakan lewat!
    });
};

// Pasang Satpam untuk SEMUA endpoint di bawah ini
app.use(satpamToken);
// ==========================================

// ==========================================
// CRUD DATA MASTER 1: TABEL KATEGORI
// ==========================================

// 1. READ: Menampilkan semua kategori
app.get('/api/kategori', (req, res) => {
    const query = 'SELECT * FROM kategori';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            pesan: "Berhasil mengambil data kategori",
            data: results
        });
    });
});

// 2. CREATE: Menambah kategori baru
app.post('/api/kategori', (req, res) => {
    const { nama_kategori } = req.body || {}; 
    const query = 'INSERT INTO kategori (nama_kategori) VALUES (?)';
    
    db.query(query, [nama_kategori], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            pesan: "Kategori berhasil ditambahkan!",
            id_baru: results.insertId
        });
    });
});

// 3. UPDATE: Mengubah data kategori
app.put('/api/kategori/:id', (req, res) => {
    const { id } = req.params;
    const { nama_kategori } = req.body || {};
    const query = 'UPDATE kategori SET nama_kategori = ? WHERE id_kategori = ?';
    
    db.query(query, [nama_kategori, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Kategori berhasil diupdate!" });
    });
});

// 4. DELETE: Menghapus kategori
app.delete('/api/kategori/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM kategori WHERE id_kategori = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Kategori berhasil dihapus!" });
    });
});


// ==========================================
// CRUD DATA MASTER 2: TABEL PRODUK
// ==========================================

// 1. READ: Menampilkan semua produk
app.get('/api/produk', (req, res) => {
    db.query('SELECT * FROM produk', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil data produk", data: results });
    });
});

// 2. CREATE: Menambah produk baru
app.post('/api/produk', (req, res) => {
    const { nama_produk, harga, stok, id_kategori } = req.body || {};
    const query = 'INSERT INTO produk (nama_produk, harga, stok, id_kategori) VALUES (?, ?, ?, ?)';
    db.query(query, [nama_produk, harga, stok, id_kategori], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Produk berhasil ditambahkan!" });
    });
});

// 3. UPDATE: Mengubah data produk
app.put('/api/produk/:id', (req, res) => {
    const { id } = req.params;
    const { nama_produk, harga, stok, id_kategori } = req.body || {};
    const query = 'UPDATE produk SET nama_produk = ?, harga = ?, stok = ?, id_kategori = ? WHERE id_produk = ?';
    
    db.query(query, [nama_produk, harga, stok, id_kategori, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Produk berhasil diperbarui!" });
    });
});

// 4. DELETE: Menghapus produk
app.delete('/api/produk/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM produk WHERE id_produk = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Produk berhasil dihapus!" });
    });
});


// ==========================================
// CRUD DATA MASTER 3: TABEL PELANGGAN
// ==========================================

// 1. READ: Menampilkan semua pelanggan
app.get('/api/pelanggan', (req, res) => {
    db.query('SELECT * FROM pelanggan', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil data pelanggan", data: results });
    });
});

// 2. CREATE: Menambah pelanggan baru
app.post('/api/pelanggan', (req, res) => {
    const { nama, email, telepon, alamat } = req.body || {};
    const query = 'INSERT INTO pelanggan (nama, email, telepon, alamat) VALUES (?, ?, ?, ?)';
    
    db.query(query, [nama, email, telepon, alamat], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Pelanggan berhasil ditambahkan!" });
    });
});

// 3. UPDATE: Mengubah data pelanggan
app.put('/api/pelanggan/:id', (req, res) => {
    const { id } = req.params;
    const { nama, email, telepon, alamat } = req.body || {};
    const query = 'UPDATE pelanggan SET nama = ?, email = ?, telepon = ?, alamat = ? WHERE id_pelanggan = ?';
    
    db.query(query, [nama, email, telepon, alamat, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Pelanggan berhasil diperbarui!" });
    });
});

// 4. DELETE: Menghapus pelanggan
app.delete('/api/pelanggan/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM pelanggan WHERE id_pelanggan = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Pelanggan berhasil dihapus!" });
    });
});


// ==========================================
// CRUD DATA TRANSAKSIONAL 1: TABEL PESANAN
// ==========================================

// 1. READ: Menampilkan semua pesanan
app.get('/api/pesanan', (req, res) => {
    db.query('SELECT * FROM pesanan', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil data pesanan", data: results });
    });
});

// 2. CREATE: Menambah pesanan baru
app.post('/api/pesanan', (req, res) => {
    const { id_pelanggan, tanggal_pesanan, total_bayar } = req.body || {};
    const query = 'INSERT INTO pesanan (id_pelanggan, tanggal_pesanan, total_bayar) VALUES (?, ?, ?)';
    
    db.query(query, [id_pelanggan, tanggal_pesanan, total_bayar], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            pesan: "Pesanan berhasil ditambahkan!", 
            id_pesanan_baru: results.insertId 
        });
    });
});

// 3. UPDATE: Mengubah data pesanan
app.put('/api/pesanan/:id', (req, res) => {
    const { id } = req.params;
    const { id_pelanggan, tanggal_pesanan, total_bayar } = req.body || {};
    const query = 'UPDATE pesanan SET id_pelanggan = ?, tanggal_pesanan = ?, total_bayar = ? WHERE id_pesanan = ?';
    
    db.query(query, [id_pelanggan, tanggal_pesanan, total_bayar, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Data pesanan berhasil diperbarui!" });
    });
});

// 4. DELETE: Menghapus pesanan
app.delete('/api/pesanan/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM pesanan WHERE id_pesanan = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Data pesanan berhasil dihapus!" });
    });
});


// ==========================================
// CRUD DATA TRANSAKSIONAL 2: DETAIL PESANAN
// ==========================================

// 1. READ: Menampilkan semua detail pesanan
app.get('/api/detail_pesanan', (req, res) => {
    db.query('SELECT * FROM detail_pesanan', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil data detail pesanan", data: results });
    });
});

// 2. CREATE: Menambah detail pesanan baru
app.post('/api/detail_pesanan', (req, res) => {
    const { id_pesanan, id_produk, jumlah, subtotal } = req.body || {};
    const query = 'INSERT INTO detail_pesanan (id_pesanan, id_produk, jumlah, subtotal) VALUES (?, ?, ?, ?)';
    
    db.query(query, [id_pesanan, id_produk, jumlah, subtotal], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ pesan: "Detail pesanan berhasil ditambahkan!" });
    });
});

// 3. UPDATE: Mengubah detail pesanan
app.put('/api/detail_pesanan/:id', (req, res) => {
    const { id } = req.params;
    const { id_pesanan, id_produk, jumlah, subtotal } = req.body || {};
    const query = 'UPDATE detail_pesanan SET id_pesanan = ?, id_produk = ?, jumlah = ?, subtotal = ? WHERE id_detail = ?';
    
    db.query(query, [id_pesanan, id_produk, jumlah, subtotal, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Detail pesanan berhasil diperbarui!" });
    });
});

// 4. DELETE: Menghapus detail pesanan
app.delete('/api/detail_pesanan/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM detail_pesanan WHERE id_detail = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Detail pesanan berhasil dihapus!" });
    });
});


// ==========================================
// STATISTIC DATA TRANSAKSIONAL
// ==========================================
app.get('/api/statistik', (req, res) => {
    const query = `
        SELECT 
            COUNT(id_pesanan) AS total_transaksi,
            SUM(total_bayar) AS total_pendapatan
        FROM pesanan
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            pesan: "Berhasil mengambil statistik toko", 
            statistik: results[0] 
        });
    });
});


// ==========================================
// MENJALANKAN SERVER API
// ==========================================
app.listen(port, () => {
    console.log(`✅ Server API berjalan di http://localhost:${port}`);
});