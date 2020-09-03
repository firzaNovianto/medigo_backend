const conn = require('../config/database')
const router = require('express').Router()
const validator = require('validator')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const jwt = require('../config/token')
const auth = require('../config/auth')
const shortid = require('shortid')

const upload = multer({
    limits: {
        fileSize: 10000000 // Byte , default 1MB
    },
    fileFilter(req, file, cb) {
       if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){ // will be error if the extension name is not one of these
          return cb(new Error('Please upload image file (jpg, jpeg, or png)')) 
       }
 
       cb(undefined, true)
    }
 })
 
 const avatarDirectory = path.join(__dirname, '../assets/avatar')
 
 // UPLOAD AVATAR
 router.post('/user/avatar', auth, upload.single('avatar'), async (req, res) => {
 
    try {
       const fileName = `${req.user.username}-avatar.png`
       const sql = `UPDATE table_detail_users SET avatar = ? WHERE user_id = ?`
       const data = [fileName, req.user.id]
 
       // Menyimpan foto di folder
       await sharp(req.file.buffer).resize(300).png().toFile(`${avatarDirectory}/${fileName}`)
 
       // Simpan nama avata di kolom 'avatar'
       conn.query(sql, data, (err, result) => {
          // Jika ada error saat running sql
          if(err) return res.status(500).send(err)
 
          // Simpan nama fotonya di database
          res.status(201).send({ message: 'Berhasil di upload' })
       })
    } catch (err) {
       res.status(500).send(err.message)
    }
 }, (err, req, res, next) => {
    // Jika terdapat masalah terhadap multer, kita akan kirimkan error
    res.send(err)
 })

 // GET AVATAR
router.get('/user/avatar/:id', (req, res) => {
    // Menyimpan username pada variable
    const id = req.params.id
 
    // Cari nama file di database
    const sql = `SELECT avatar FROM table_detail_users WHERE user_id = '${id}'`
 
    // Kirim file ke client
    conn.query(sql, (err, result) => {
 
       // Jika ada error saat running sql
       if(err) return res.status(500).send(err)
 
       
       try {
          // Nama file avatar
          const fileName = result[0].avatar
          // Object options yang menentukan dimana letak avatar disimpan
          const options = {
             root: avatarDirectory
          }
 
          // Mengirim file sebagai respon
          // alamatFolder/namaFile, cbfunction
          res.sendFile(`${avatarDirectory}/${fileName}`, (err) => {
             // Mengirim object error jika terjadi masalah
             if(err) return res.status(200).send(err)
 
 
          })
       } catch (err) {
          res.status(500).send(err)
       }
 
    })
 })

 // EDIT users
router.patch('/user/profile', auth, (req, res) => {
    try {
        const sqlUpdate = `UPDATE table_detail_users SET ? WHERE user_id = ? `
        const dataUpdate = [req.body , req.user.id]
        
        // insert semua data text
        conn.query(sqlUpdate, dataUpdate, (err, result) => {
            if (err) return res.status(500).send(err)
                res.status(200).send(result)
            })
                 } catch (err) {
                 res.status(500).send(err)
                }
 })

 // UPDATE AVATAR
router.post('/user/avatar', auth, upload.single('avatar'), async (req,res) => {

    try {
        const sql = `UPDATE table_detail_users SET avatar = ? WHERE user_id = ?`
        const fileName = `${shortid.generate()}.png`
        const data = [fileName, req.user.id]
        
        await sharp(req.file.buffer).resize(200).png().toFile(`${avatarDirectory}/${fileName}`)
 
        conn.query(sql, data, (err, result) => {
            if (err) return res.status(500).send(err)
 
            res.status(200).send({message: "Update data berhasil"})
 
        })
    } catch (error) {
        res.status(500).send(error.message)
    }
    
 }, (err, req, res, next) => { // it should declare 4 parameters, so express know this is function for handling any uncaught error
    res.status(400).send(err.message)
 })


// REGISTER USER
router.post('/register', (req, res) => {
    // req.body = {username, password}
 
    // Query insert data
    const sql = `INSERT INTO table_users SET ? `
    
    const data = req.body
 
    // Hash password
    data.password = bcrypt.hashSync(data.password, 8)
    
    // Running query
    conn.query(sql, data, (err, resu) => {
       // Jika ada error kita akan kirim object errornya
       if(err) return res.status(500).send({message : 'Username sudah terpakai'})
 
       const sql2= `INSERT INTO table_detail_users SET user_id= ${resu.insertId}`
       conn.query(sql2,(err, result) => {
          if(err) return res.status(500).send(err)
       
       // Jika berhasil, kirim object
       
    })
    res.status(201).send({message : 'berhasil registrasi'})
    })
 })

 // REGISTER DOKTER
router.post('/register_dokter', (req, res) => {
    // req.body = {username, password}
 
    // Query insert data
    const sql = `INSERT INTO table_users SET ? `
    
    const data = req.body
 
    // Hash password
    data.password = bcrypt.hashSync(data.password, 8)
    
    // Running query
    conn.query(sql, data, (err, resu) => {
       // Jika ada error kita akan kirim object errornya
       if(err) return res.status(500).send({message : 'Username sudah terpakai'})
 
       const sql2= `INSERT INTO table_detail_users SET user_id= ${resu.insertId}`
       conn.query(sql2,(err, result) => {
          if(err) return res.status(500).send(err)
       
       // Jika berhasil, kirim object
       
    })
    res.status(201).send({message : 'berhasil registrasi'})
    })
 })

 // LOGIN USER
router.post('/user/login', (req, res) => {
    const {username, password} = req.body
 
    const sql = `SELECT * FROM table_users WHERE username = '${username}'`
    const sql2 = `INSERT INTO table_tokens SET ?`
    
    conn.query(sql, (err, result) => {
       // Cek error
       if(err) return res.status(500).send(err)
 
       // result = [ {} ]
       let user = result[0]
       // Jika username tidak ditemukan
       if(!user) return res.status(404).send({message: 'username tidak ditemukan'})
       // Verifikasi password
       let validPassword = bcrypt.compareSync(password, user.password)
       // Jika user memasukkan password yang salah
       if(!validPassword) return res.status(400).send({message: 'password tidak valid'})
       // Membuat token
       let token = jwt.sign({ id: user.id}, 'secretcode')
       // Property user_id dan token merupakan nama kolom yang ada di tabel 'tokens'
       const data = {user_id : user.id, token : token}
 
       conn.query(sql2, data, (err, result) => {
          if(err) return res.status(500).send(err)
          
          // Menghapus beberapa property
          delete user.password
          delete user.avatar
          const sql3 = `UPDATE table_users SET token_id = ${result.insertId} WHERE id = ${user.id} `
          conn.query(sql3)
          res.status(200).send({
             message: 'Login berhasil',
             user,
             token
          })
       })
    })
 
 })

 // GET PROFILE
router.get('/user/profile/',auth, (req, res) => {

    const sql = `SELECT * FROM table_detail_users d
    JOIN table_users u ON d.user_id = u.id
    WHERE user_id = ${req.user.id}`
 
    conn.query(sql, (err, results) => {
       if(err) return res.status(500).send(err)
       
       res.status(200).send(
          {results,
             photo : `http://localhost:2022/user/avatar/${req.user.id}` 
          }
       )
    })
 })

 // LOGOUT
router.delete('/logout', auth, (req,res) => {
    const sql = `DELETE FROM table_tokens WHERE user_id = ${req.user.id}`
    
    conn.query(sql, (err, result) => {
        if(err) return res.status(500).send(err)
        
       res.status(200).send({
          message : "delete berhasil",
          result
       })
     })
 })

//GET SPESIALIS
 router.get('/spesialis',(req,res) => {
     const sql = `SELECT * FROM table_spesialis`
     conn.query(sql, (err, result) => {
        if(err) return res.status(500).send(err)
        
       res.status(200).send(result)
     })
 })

//GET DOKTER
 router.get('/cari_dokter',(req,res) => {
     const sql = `select u.id, d.name , d.avatar , d.gender , d.email , d.telepon ,d.alamat, u.username, u.role_id, u.spesialis_id ,s.spesialis
     from table_detail_users d 
     join table_users u on d.user_id = u.id
     join table_spesialis s on u.spesialis_id = s.id
     where u.role_id = 2 and d.status = "Luang";`

     conn.query(sql, (err, result) => {
        if(err) return res.status(500).send(err)
        
       res.status(200).send(result)
     })
 }) 

 //POST AKTIFITAS

 router.post('/daftar',auth,(req,res) => {
     const sqlcek = `SELECT * FROM table_aktifitas WHERE user_id = ${req.user.id} and dokter_id = ${req.body.dokter_id}`
     const sql = `
     INSERT INTO table_aktifitas (user_id,dokter_id) VALUES (${req.user.id},${req.body.dokter_id})`
     conn.query(sqlcek, (err, resu) => {
      if(err) return res.status(500).send(err)
      if(resu.length > 0) return res.status(200).send({message:"tidak bisa mendaftar lebih dari 1x pada dokter yang sama"})

     conn.query(sql, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send({message:"berhasil mendaftar"})
     })
   })
     
    })

//Jadwal kunjungan 

router.get('/jadwal_kunjungan',auth ,(req,res) => {
   const sql = `select * 
   from table_aktifitas a 
   join table_detail_users u ON a.dokter_id = u.user_id
   join table_users s on a.dokter_id = s.id
   join table_spesialis p on s.spesialis_id = p.id
   where a.user_id = ${req.user.id} `

   conn.query(sql, (err, result) => {
      if(err) return res.status(500).send(err)
      
     res.status(200).send(result)
   })
}) 

//GET PASIEN



router.get('/pasien',auth ,(req,res) => {
   const sql = `select * 
   from table_aktifitas a 
   join table_detail_users d on a.user_id = d.id
   where dokter_id = ${req.user.id} `

   conn.query(sql, (err, result) => {
      if(err) return res.status(500).send(err)
      
     res.status(200).send(result)
   })
}) 

router.delete('/finish/:id',auth ,(req,res) => {
   const sql = `delete from table_aktifitas 
   where user_id = ${req.params.id} and dokter_id = ${req.user.id}`
   conn.query(sql, (err, result) => {
      if(err) return res.status(500).send(err)
      
     res.status(200).send(result)
   })
}) 

// EDIT STATUS
router.patch('/status/', auth, (req, res) => {
   const sqlUpdate = `UPDATE table_detail_users SET ? WHERE user_id = ?`
   const dataUpdate = [req.body, req.user.id]        
       
       conn.query(sqlUpdate, dataUpdate, (err, result) => {
           if (err) return res.status(500).send(err)

           res.status(200).send({message: "Update data berhasil"})
       })    
   }) 



 module.exports = router