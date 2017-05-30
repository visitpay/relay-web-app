/*
 * vim: ts=4:sw=4:expandtab
 */
(async function () {
    'use strict';

    await Promise.all([storage.ready(), F.tpl.fetchAll()]);
    if (Whisper.Registration.isDone()) {
        console.info("Loading foundation...");
        initFoundation();
    } else {
        console.warn("No registration found");
        window.location.replace('install');
    }

    await ConversationController.fetchConversations();

    //const $body = $('body', document).empty();
    const view = new F.MainView();
    //view.$el.prependTo($body);
    window.openConversation = function(conversation) {
        if (conversation) {
            view.openConversation(null, conversation);
        }
    };
    openConversation(getOpenConversation());
    return; // XXX

    const onNavClick = async function(ev) {
        const table = ev.data;
        const row = $(ev.currentTarget);
        table.find('tr').removeClass('active');
        row.addClass('active');
        convo = inbox.get(row.data('cid'));
        await convo.fetchContacts();
        await convo.fetchMessages();
        const messages = convo.messageCollection.map(msg => {
            const out = {};
            const contact = msg.getContact();
            if (contact) {
                out.avatar = contact.getAvatar();
                out.name = contact.getName();
            } else {
                out.name = msg.source;
                out.avatar = {
                    content: '?'
                };
            }
            out.attachments = [];
            for (const x of msg.get('attachments')) {
                const blob = new Blob([x.data], {type: x.contentType});
                out.attachments.push({
                    url: URL.createObjectURL(blob),
                    content_type: x.contentType
                });
            }
            out.when = (Date.now() - msg.timestamp) / 1000;
            out.timestamp = msg.get('timestamp');
            out.flags = msg.get('flags');
            out.type = msg.get('type');
            out.id = msg.get('id');
            out.body = msg.get('body');
            return out;
        });
        await F.tpl.render('f-article-feed', messages.reverse())
    };

    const onComposeSend = async function(ev) {
        const box = ev.data;
        if (!convo) {
            alert('XXX no convo');
            return;
        }
        const message = box.find('textarea').val();
        convo.sendMessage(message, []);
    };

    const onTOCMenuClick = async function(ev) {
        const item = $(ev.currentTarget);
        console.log('fun stuff for menu', item);
    };

    const onUserMenuClick = async function(ev) {
        const item = $(ev.currentTarget);
        const m = await F.tpl.render('f-modal-profile', ev.data);
        m.modal({blurring: true}).modal('show');
    };

    /* XXX/TODO: Viewify these so controller bindings happen automattically */
    await Promise.all([
        F.ccsm.getUserProfile().then(user =>
            F.tpl.render('f-header-menu', user).then(ctx => {
                ctx.on('click', '.menu .f-toc a.item', user, onTOCMenuClick);
                ctx.on('click', '.menu .f-user a.item', user, onUserMenuClick);
            })),
        F.tpl.render('f-nav-conversations', inbox.models.map(x => ({
            cid: x.cid,
            title: x.getTitle(),
            unreadCount: x.attributes.unreadCount,
            avatar: x.getAvatar(),
            lastMessage: x.get('lastMessage')
        }))).then(ctx => {
            ctx.on('click', 'tbody tr', ctx, onNavClick);
        }),
        F.tpl.render('f-nav-pinned', {}),
        F.tpl.render('f-nav-announcements', {}),
        F.tpl.render('f-article-org', {}),
        F.tpl.render('f-article-compose', {}).then(ctx => {
            ctx.on('click', '.f-send', ctx, onComposeSend);
            ctx.find('textarea').focus();
        }),
        F.tpl.render('f-article-feed', {})
    ]);
}());
