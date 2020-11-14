const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const client = new Discord.Client({ ws: { intents: Discord.Intents.ALL } });
const config = require('./config.json');

var connectionList = {};

client.on('ready', () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
});

client.on('message', (message) => {
    // Ignore if the message is from the bot/doesn't have the prefix
    if (!message.content.startsWith(config.prefix) || message.author.bot) return;

    // Get the argument list
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);

    // Check to make sure there's actually a command
    if (args.length === 0) return;

    // Run a command or send message for an invalid command
    if (args[0] === 'help') helpCommand(message);
    else if (args[0] === 'play') playCommand(message);
    else if (args[0] === 'stop') stopCommand(message);
    else if (args[0] === 'time') timeCommand(message);
    else {
        message.channel.send(args[0] + ' is not a command. Type help for more info!');
    }
});

client.login(config.token);

/**
 * Prints out the help message to the user
 *
 * @param {Discord.Message} message the Discord message object
 */
function helpCommand(message) {
    const embed = new Discord.MessageEmbed()
        .setColor('#65cdf1')
        .setTitle('Chill Music Commands')
        .setDescription(
            'help - Prints this message\nplay - Plays the song\nstop - Stops the song and leaves\ntime - Displays listening time'
        );
    message.channel.send(embed);
}

/**
 * Plays the song!
 *
 * @param {Discord.Message} message the Discord message object
 */
async function playCommand(message) {
    // Check if in vc
    const vc = message.member.voice.channel;
    if (!vc) {
        message.channel.send('You must be in a VC to listen to music!');
        return;
    }

    // Check for perms
    const perms = vc.permissionsFor(message.client.user);
    if (!perms.has('CONNECT') || !perms.has('SPEAK')) {
        message.channel.send("You're not cool enough to get music >:))");
        return;
    }

    // Check if already playing
    if (connectionList[message.guild.id]) {
        message.channel.send('Already playing music!');
        return;
    }

    // Join VC and play music
    // Also add a connection object to the list for the current guild id
    try {
        var currConnection = await vc.join();
        connectionList[message.guild.id] = new Connection(message.channel, vc, currConnection);
        startSong(message.guild.id);
        message.channel.send('Started playing music :DD');
    } catch (err) {
        message.channel.send('Error playing song!');
        if (connectionList[message.guild.id]) delete connectionList[message.guild.id];
    }
}

/**
 * Starts playing a song, downloading it from yt
 *
 * @param {string} id the current guild id
 */
function startSong(id) {
    if (!connectionList[id]) return;

    const dispatcher = connectionList[id].connection
        .play(ytdl(config.url))
        .on('finish', () => {
            startSong(id);
        })
        .on('error', (error) => {
            message.channel.send('Error playing: ' + error);
        });
    dispatcher.setVolumeLogarithmic(1); // TODO: Maybe change this?
}

/**
 * Stops the song and leaves the VC
 *
 * @param {Discord.Message} message the Discord message object
 */
async function stopCommand(message) {
    // Check if not playing
    if (!connectionList[message.guild.id]) {
        message.channel.send('Not currently playing music! Use the `play` command to start music.');
        return;
    }

    // Disconnect and stop music
    connectionList[message.guild.id].connection.dispatcher.end();
    connectionList[message.guild.id].vc.leave();
    message.channel.send('Stopped music! Play time: ' + formatTimeChange(message.guild.id));
    delete connectionList[message.guild.id];
}

/**
 * Displays the time the user has spent listening to the song
 *
 * @param {Discord.Message} message the Discord message object
 */
async function timeCommand(message) {
    // Check if not playing
    if (!connectionList[message.guild.id]) {
        message.channel.send('Not currently playing music! Use the `play` command to start music.');
        return;
    }

    // Print time message
    message.channel.send("You've been listening to music for: " + formatTimeChange(message.guild.id));
}

/**
 * Gets the change in time and formats it
 * @param {string} id the guild id
 * @returns {string} A formatted time string (00:00:00.000)
 */
function formatTimeChange(id) {
    var diff = new Date().getTime() - connectionList[id].startTime;
    var hours = Math.floor(diff / 3600000);
    diff %= 3600000;
    var mins = Math.floor(diff / 60000);
    diff %= 60000;
    var secs = Math.floor(diff / 1000);
    var ms = diff % 1000;
    console.log(hours);
    return `${pad(hours, 2)}:${pad(mins, 2)}:${pad(secs, 2)}.${pad(ms, 3)}`;
}

function pad(num, size) {
    if (num.toString().length < size) num = ('0'.repeat(size) + num).slice(-size);
    return num;
}

class Connection {
    /**
     * Creates a connection object
     * @param {Discord.TextChannel} tc
     * @param {Discord.VoiceChannel} vc
     * @param {Discord.VoiceConnection} connection
     */
    constructor(tc, vc, connection) {
        this.tc = tc;
        this.vc = vc;
        this.connection = connection;
        this.startTime = new Date().getTime();
    }
}
