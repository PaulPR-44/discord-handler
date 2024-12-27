const { readdirSync } = require('fs');
const { join } = require('path');
const { Collection, REST, Routes, SlashCommandBuilder, ApplicationCommandType, ContextMenuCommandBuilder } = require('discord.js');

module.exports = async ({ DiscordClient, dirname, commandDir, eventsDir, buttonsDir, contextMenusDir, menusDir, modalsDir}) => {
    DiscordClient.commands = new Collection();
    DiscordClient.events = new Collection();
    DiscordClient.buttons = new Collection();
    DiscordClient.contextMenus = new Collection();
    DiscordClient.menus = new Collection();
    DiscordClient.modals = new Collection();

    const load = (dir, collection) => {
        const files = readdirSync(join(dirname, dir)).filter(file => file.endsWith('.js'));

        for (const file of files) {
            const command = require(join(dirname, dir, file));
            command.name = file.split('.')[0];
            collection.set(command.name, command);
        }
    }

    await load(eventsDir, DiscordClient.events);
    const interactionCreateFile = readdirSync(__dirname).find(file => file === 'interactionCreate.js');
    const interactionCreate = require(join(__dirname, interactionCreateFile));
    interactionCreate.name = 'interactionCreate';
    DiscordClient.events.set('interactionCreate', interactionCreate);
    DiscordClient.events.forEach(event => {
        DiscordClient.on(event.name, (...args) => event.run(DiscordClient, ...args));
    });
    load(commandDir, DiscordClient.commands);
    load(buttonsDir, DiscordClient.buttons);
    load(contextMenusDir, DiscordClient.contextMenus);
    load(menusDir, DiscordClient.menus);
    load(modalsDir, DiscordClient.modals);

    DiscordClient.on('ready', async () => {
        let commands = [];

        DiscordClient.commands.forEach(command => {
            if (process.env.ENVIRONMENT !== "dev" && command.description?.startsWith("DEVMODE")) return;
            let data = new SlashCommandBuilder()
                .setName(command.name)
                .setDescription(command.description || 'No description');

            if (command.options?.length > 0) {
                for (let option of command.options) {
                    switch (option.type) {
                        case 'string':
                            data.addStringOption(opt => {
                                opt.setName(option.name)
                                    .setDescription(option.desc || 'No description')
                                    .setRequired(option.required || false);

                                if (option.choices) {
                                    option.choices.forEach(choice => {
                                        opt.addChoice(choice.name, choice.value)
                                    });
                                }

                                return opt;
                            });
                           break;

                        case 'int':
                            data.addIntegerOption(opt =>
                                opt.setName(option.name)
                                    .setDescription(option.desc || 'No description')
                                    .setRequired(option.required || false)
                            );
                            break;

                        case 'number':
                            data.addNumberOption(opt =>
                                opt.setName(option.name)
                                    .setDescription(option.desc || 'No description')
                                    .setRequired(option.required || false)
                            );
                            break;

                        case 'boolean':
                            data.addBooleanOption(opt =>
                                opt.setName(option.name)
                                    .setDescription(option.desc || 'No description')
                                    .setRequired(option.required || false)
                            );
                            break;

                        case 'user':
                            data.addUserOption(opt =>
                                opt.setName(option.name)
                                    .setDescription(option.desc || 'No description')
                                    .setRequired(option.required || false)
                            );
                            break;

                        case 'channel':
                            data.addChannelOption(opt =>
                                opt.setName(option.name)
                                    .setDescription(option.desc || 'No description')
                                    .setRequired(option.required || false)
                            );
                            break;

                        case 'role':
                            data.addRoleOption(opt =>
                                opt.setName(option.name)
                                    .setDescription(option.desc || 'No description')
                                    .setRequired(option.required || false)
                            );
                            break;
                    }
                }
            }

            commands.push(data.toJSON());
        });



        DiscordClient.contextMenus.forEach(menu => {
            let data = new ContextMenuCommandBuilder()
                .setName(menu.name)

            switch (menu.type) {
                case 'user':
                    data.setType(ApplicationCommandType.User);
                    break;

                case 'message':
                    data.setType(ApplicationCommandType.Message);
                    break;
            }

            commands.push(data.toJSON());
        });

        const rest = new REST({ version: '9' }).setToken(DiscordClient.token);

        try {
            await rest.put(
                Routes.applicationCommands(DiscordClient.user.id),
                { body: commands }
            );
        } catch (e) {
            console.log(e)
        }
    });

    return DiscordClient;
}