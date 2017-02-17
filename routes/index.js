var User = require('../modules/user')
var Post = require('../modules/post')
var Comment = require('../modules/comment')
//加密的模块
var crypto = require('crypto')
var multer = require('multer')
//multer配置
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/upload')
    },
    filename: function (req, file, cb) {
        var name = req.session.user.name
        cb(null, `${name}.jpg`)
    }
})

var upload = multer({ storage: storage })
function checkLogin(req, res, next) {
    if (!req.session.user) {
        req.flash('error', '未登录')
        res.redirect('/login')

    }
    next()
}

function checkNotLogin(req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录')
        res.redirect('back')

    }
    next()
}

module.exports = function (app) {
    app.get('/', function (req, res) {
        //判断是否是第一页，并把请求的页数转换成 number 类型
        var page = parseInt(req.query.p) || 1;

        //查询并返回第 page 页的 10 篇文章
        Post.getTen(null, page, function (err, posts, total) {
            if (err) {
                posts = [];
            }
            var pageCount = Math.ceil(total / 5)
            var pages = [page]
            function getPage(page, pageCount) {

                var left = page - 1
                var right = page + 1
                while (pages.length < 3 && (left > 1 || right < pageCount)) {

                    if (left > 0) pages.unshift(left--);
                    if (right < pageCount) pages.push(right++)

                }
                return pages
            }

            res.render('index', {
                title: '主页',
                posts: posts,
                page: page,
                pageCount: pageCount,
                total: total,
                pages: getPage(page, pageCount),
                isFirstPage: (page - 1) == 0,
                isLastPage: ((page - 1) * 5 + posts.length) == total
            });
            console.log(getPage(page, pageCount))
        });
    });
    //注册
    app.get('/reg', checkNotLogin)
    app.get('/reg', function (req, res) {
        res.render('reg', {
            title: '注册'
        })
    })
    app.post('/reg', function (req, res) {
        //先获取注册信息
        var name = req.body.name
        var password = req.body.password
        var password_re = req.body['password-repeat']
        var nickname = req.body.nickname
        //检查一下两次密码
        if (password_re != password) {
            req.flash('error', '两次密码不一样')
            return res.redirect('/reg')
        }
        //对密码加密处理
        var md5 = crypto.createHash('md5')
        var password = md5.update(req.body.password).digest('hex')
        //整理一下放到对象里面
        var newUser = new User({
            nickname: nickname,
            name: name,
            password: password,
            email: req.body.email
        })
        //检查一下用户名是否存在
        User.get(newUser.name, function (err, user) {
            if (err) {
                req.flash('error', err)
                return res.redirect('/')
            }
            //用户名被占用
            if (user) {
                req.flash('error', '用户名被占')
                return res.redirect('/reg')
            }
            //正常可以存入数据
            newUser.save(function (err, user) {
                if (err) {
                    req.flash('error', err)

                }
                req.session.user = newUser;
                //console.log(req.session.user);
                req.flash('success', '注册成功');
                res.redirect('/');

            })
        })
    })
    //登录
    app.get('/login', checkNotLogin)
    app.get('/login', function (req, res) {
        res.render('login', {
            title: '登录'

        })
    })
    app.post('/login', function (req, res) {
        //先生称密码的加密
        var md5 = crypto.createHash('md5')
        var password = md5.update(req.body.password).digest('hex')
        User.get(req.body.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户名不存在');
                return res.redirect('/login');
            }
            //检查密码是否一致
            if (user.password != password) {
                req.flash('error', '密码错误');
                return res.redirect('/login');
            }
            //都匹配之后，将用户的信息存入session
            req.session.user = user;
            req.flash('success', '登录成功');
            return res.redirect('/');
        })
    })
    //发布
    app.get('/post', checkLogin)
    app.get('/post', function (req, res) {
        res.render('post', {
            title: '发表'

        })
    })
    app.post('/post', function (req, res) {

        var currentUser = req.session.user;
        var tags = [req.body.tag1, req.body.tag2, req.body.tag3];
        var newPost = new Post(currentUser.name, req.body.title, tags, req.body.post);
        newPost.save(function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            req.flash('success', '发布成功!');
            res.redirect('/');//发表成功跳转到主页 最好加个return
        });
        console.log('上传成功')
    })
    //退出
    app.get('/logout', checkLogin)
    app.get('/logout', function (req, res) {
        req.session.user = null;
        req.flash('success', '退出成功');
        res.redirect('/');
    })
    app.post('/logout', function (req, res) {

    })
    //上传页面
    app.get('/upload', checkLogin)
    app.get('/upload', function (req, res) {
        res.render('upload', {
            title: '上传头像',


        })
    })
    //上传行为
    app.post('/upload', checkLogin)
    app.post('/upload', upload.array('field1', 5), function (req, res) {
        req.flash('success', '头像更新成功!');
        res.redirect('/person');
    })
    app.get('/archive', function (req, res) {
        Post.getArchive(function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('archive', {
                title: '存档',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/tags', function (req, res) {
        Post.getTags(function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tags', {
                title: '标签',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/tags/:tag', function (req, res) {
        Post.getTag(req.params.tag, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tag', {
                title: 'TAG:' + req.params.tag,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/search', function (req, res) {
        Post.search(req.query.keyword, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('search', {
                title: "SEARCH:" + req.query.keyword,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/u/:name', function (req, res) {
        var page = parseInt(req.query.p) || 1;
        //检查用户是否存在
        User.get(req.params.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/');
            }
            //查询并返回该用户第 page 页的 10 篇文章
            Post.getTen(user.name, page, function (err, posts, total) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: user.name,
                    posts: posts,
                    page: page,
                    total: total,
                    isFirstPage: (page - 1) == 0,
                    isLastPage: ((page - 1) * 10 + posts.length) == total,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });
    app.get('/search', function (req, res) {
        Post.search(req.query.keyword, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('search', {
                title: "SEARCH:" + req.query.keyword,
                posts: posts
            });
        });
    });
    //查询一篇文章
    app.get('/u/:name/:second/:title', function (req, res) {
        Post.getOne(req.params.name, req.params.second, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('article', {
                title: req.params.title,
                post: post
            });
        });
    })
    app.post('/comment/:name/:minute/:title', function (req, res) {
        var date = new Date(),
            time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
                date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
        var comment = {
            name: req.body.name,
            time: time,
            content: req.body.content
        };
        var newComment = new Comment(req.params.name, req.params.minute, req.params.title, comment);
        newComment.save(function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '留言成功!');
            res.redirect('back');
        });
    })
    app.get('/edit/:name/:second/:title', checkLogin);
    app.get('/edit/:name/:second/:title', function (req, res) {
        var currentUser = req.session.user;
        Post.edit(currentUser.name, req.params.second, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            res.render('edit', {
                title: '编辑',
                post: post
            });
        });
    });

    app.post('/edit/:name/:second/:title', checkLogin);
    app.post('/edit/:name/:second/:title', function (req, res) {
        var currentUser = req.session.user;
        Post.update(currentUser.name, req.params.second, req.params.title, req.body.post, function (err) {
            //encodeURI可以把字符串作为URI进行编码
            //url是http开头的uri
            var url = encodeURI('/u/' + req.params.name + '/' + req.params.second + '/' + req.params.title);
            if (err) {
                req.flash('error', err);
                return res.redirect(url);//出错！返回文章页
            }
            req.flash('success', '修改成功!');
            res.redirect(url);//成功！返回文章页
        });
    });
    app.get('/remove/:name/:day/:title', checkLogin);
    app.get('/remove/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '删除成功!');
            res.redirect('/');
        });
    });
    app.get('/person', checkLogin);
    app.get('/person', function (req, res) {
        var currentUser = req.session.user
        User.edit(currentUser.name, function (err) {
            console.log('get')
            if (err) {
                req.flash('error', err)
                return res.redirect('back')
            }
            res.render('person', {
                title: '个人信息',
                user: req.session.user,
              
            })

        })
    })
    app.post('/person', function (req, res) {
        var currentUser = req.session.user
        User.update(currentUser.name,function (err) {

            if (err) {
                req.flash('error', err)
                return res.redirect('back')
              
            }
              console.log(err)
            req.flash('success', '更换成功!');
             res.redirect('/')
        })
    })

}