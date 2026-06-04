var express = require('express');
var router = express.Router();
const { getConnection } = require('../connect');
const oracledb = require('oracledb');

/* 게시글 목록 */
router.get('/', function (req, res, next) {
    res.render('index', { title: '게시글', pageName: 'posts/list.ejs' });
});

//게시글 목록 데이터
router.get('/list.json', async function(req, res){
    const page=parseInt(req.query.page) || 1;
    const size=parseInt(req.query.size) || 5;
    const keyword = (req.query.keyword || '').trim();
    const startRow = (page-1) * size + 1;
    const endRow = page * size;
    let con;
    try{
        con = await getConnection();
        const where = keyword ? "where sname like :keyword" : "";
        const binds = keyword ? {startRow, endRow, keyword: `%${keyword}%`} : {startRow, endRow};
        let sql=`select *
                 from (
                    select v.*, row_number() over(order by rn) search_rn
                    from view_posts v
                    ${where}
                 )
                 where search_rn between :startRow and :endRow`;
        let result=await con.execute(sql, binds, {outFormat:oracledb.OUT_FORMAT_OBJECT});
        const list=result.rows;
        sql=`select count(*) from view_posts ${where}`;
        result=await con.execute(sql, keyword ? {keyword: `%${keyword}%`} : {});
        const total=result.rows[0][0];
        res.send({list, total});
    }catch(err){
        console.log(err);
    }finally{
        if(con) await con.close();
    }
});

//게시글 등록 페이지
router.get('/insert', function(req, res){
    res.render('index', {title:'글쓰기', pageName:'posts/insert.ejs'});
})

//게시글 등록
router.post('/insert', async function(req, res){
    const title=req.body.title;
    const content=req.body.content;
    const writer=req.body.writer;
    let con;
    try{
        con = await getConnection();
        let sql="insert into posts(title, content, writer, reg_date) values(:title, :content, :writer, sysdate)";
        await con.execute(sql, {title, content, writer}, {autoCommit:true});
        res.sendStatus(200);
    }catch(err){
        console.log(err)
    }finally{
        if(con) await con.close();
    }
})

//게시글 정보 페이지
router.get('/:id', async function(req, res){
    const id = req.params.id;
    let con;
    try{
        con = await getConnection();
        let sql = "select * from view_posts where id=:id";
        let result = await con.execute(sql, {id}, {outFormat:oracledb.OUT_FORMAT_OBJECT});
        let post = result.rows[0];
        //console.log(post);
        res.render('index', {title:'게시글 정보', pageName:'posts/read.ejs', post});
    }catch(err){
        console.log('글정보', err);
    }finally{
        if(con) await con.close();
    }
});

//게시글 삭제
router.post('/delete', async function(req, res){
    const id=req.body.id;
    let con;
    try{
        con = await getConnection();
        let sql = "delete from posts where id=:id";
        await con.execute(sql, {id}, {autoCommit:true});
        res.sendStatus(200);
    }catch(err){
        console.log('글삭제', err.message);
        res.sendStatus(500);
    }finally{
        if(con) await con.close();
    }
});

//게시글 수정 페이지
router.get('/update/:id', async function(req, res) {
    const id = req.params.id;
    let con;
    try{
        con = await getConnection();
        let sql = "select * from view_posts where id=:id";
        let result = await con.execute(sql, {id}, {outFormat:oracledb.OUT_FORMAT_OBJECT});
        let post = result.rows[0];
        //console.log(post);
        res.render('index', {title:'글수정', pageName:'posts/update.ejs', post});
    }catch(err){
        console.log('글수정 페이지', err.message);
    }finally{
        if(con) await con.close();
    }
});

//게시글 수정
router.post('/update', async function(req, res){
    const id=req.body.id;
    const title=req.body.title;
    const content=req.body.content;
    console.log(id, title, content);
    try{
        con = await getConnection();
        let sql="update posts set title=:title, content=:content where id=:id";
        await con.execute(sql, {id, title, content}, {autoCommit:true});
        res.sendStatus(200);
    }catch(err){
        console.log('글수정', err.message);
    }
});

module.exports = router;
