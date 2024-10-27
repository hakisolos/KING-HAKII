const { isJidGroup } = require("@whiskeysockets/baileys");
const config = require("../config");
const { DataTypes } = require("sequelize");

const chatDb = config.DATABASE.define("Chat", {
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  conversationTimestamp: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isGroup: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
});

const messageDb = config.DATABASE.define("message", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
});

const contactDb = config.DATABASE.define("contact", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const saveContact = async (jid, name) => {
  try {
    if (!jid || !name) {
      console.log("Invalid JID or name:", { jid, name });
      return;
    }
    if (isJidGroup(jid)) return;

    const exists = await contactDb.findOne({ where: { jid } });
    if (exists) {
      if (exists.name === name) {
        console.log("Contact already exists with the same name:", name);
        return;
      }
      await contactDb.update({ name }, { where: { jid } });
      console.log("Updated contact:", { jid, name });
    } else {
      await contactDb.create({ jid, name });
      console.log("Created new contact:", { jid, name });
    }
  } catch (e) {
    console.log("Error in saveContact:", e);
  }
};

const saveMessage = async (message, user) => {
  try {
    const jid = message.key.remoteJid;
    const id = message.key.id;
    const msg = message;

    console.log("Saving message with JID:", jid, "and ID:", id);

    if (!id || !jid || !msg) {
      console.log("Invalid message data:", { id, jid, msg });
      return;
    }

    await saveContact(user, message.pushName);
    
    let exists = await messageDb.findOne({ where: { id, jid } });
    if (exists) {
      await messageDb.update({ message: msg }, { where: { id, jid } });
      console.log("Updated message:", { id, jid });
    } else {
      await messageDb.create({ id, jid, message: msg });
      console.log("Created new message:", { id, jid });
    }
  } catch (e) {
    console.log("Error in saveMessage:", e);
  }
};

const loadMessage = async (id) => {
  if (!id) {
    console.log("Invalid message ID:", id);
    return false;
  }
  const message = await messageDb.findOne({
    where: { id },
  });
  if (message) {
    console.log("Loaded message:", message.dataValues);
    return message.dataValues;
  }
  console.log("Message not found for ID:", id);
  return false;
};

const saveChat = async (chat) => {
  if (chat.id === "status@broadcast" || chat.id === "broadcast") return;
  if (!chat.id || !chat.conversationTimestamp) {
    console.log("Invalid chat data:", chat);
    return;
  }

  let isGroup = isJidGroup(chat.id);
  console.log("Saving chat with ID:", chat.id, "and timestamp:", chat.conversationTimestamp);

  let chatexists = await chatDb.findOne({ where: { id: chat.id } });
  if (chatexists) {
    await chatDb.update(
      { conversationTimestamp: chat.conversationTimestamp },
      { where: { id: chat.id } }
    );
    console.log("Updated chat:", { id: chat.id });
  } else {
    await chatDb.create({
      id: chat.id,
      conversationTimestamp: chat.conversationTimestamp,
      isGroup,
    });
    console.log("Created new chat:", { id: chat.id });
  }
};

const getName = async (jid) => {
  if (!jid) {
    console.log("Invalid JID:", jid);
    return null;
  }
  
  const contact = await contactDb.findOne({ where: { jid } });
  if (!contact) {
    console.log("Contact not found for JID:", jid);
    return jid.split("@")[0].replace(/_/g, " ");
  }
  
  console.log("Found contact name for JID:", jid, "Name:", contact.name);
  return contact.name;
};

module.exports = {
  saveMessage,
  loadMessage,
  saveChat,
  getName,
};
