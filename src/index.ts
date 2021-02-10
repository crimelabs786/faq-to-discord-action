import { getInput, error, debug, info } from "@actions/core";
import { Client, MessageEmbed, TextChannel } from "discord.js";
import * as glob from "@actions/glob";
import { readFileSync } from "fs";
import matter from "gray-matter";
import { basename, extname, parse } from "path";
import { last } from "lodash";
import {
  Color,
  truncate,
  countMessagesRequired,
  MAX_INDICES_IN_AN_EMBED,
  MAX_TRUNCATE_LENGTH,
} from "./util";

async function run() {
  const discordToken = getInput("discord_token");
  const discordChannel = getInput("discord_channel");
  const websiteBaseUrl = getInput("website_base_url");
  const slugReplacePath = getInput("slug_replace_path");
  const globber = await glob.create(getInput("faq_glob"), {
    omitBrokenSymbolicLinks: true,
  });
  const discordClient = new Client();
  const colors = new Color();
  const files = await globber.glob();

  const items = await Promise.all(
    files.map(async (file) => {
      const markdown = matter(readFileSync(file, "utf-8"));
      info(`Processing: ${file}`);

      const title: string =
        markdown.data.title || basename(file, extname(file));
      const path = parse(file.split("/").slice(6).join("/"));
      const readUrl = `${websiteBaseUrl}${path.dir.slice(
        slugReplacePath.length
      )}/${path.name}`;

      debug(`Read url for ${file} is at: ${readUrl}`);

      return {
        title,
        readUrl,
        description: [
          truncate(markdown.content, MAX_TRUNCATE_LENGTH, "..."),
          `📰 [Read more](${readUrl})`,
        ].join("\n\n"),
      } as const;
    })
  );

  const embeds = items.map(({ title, description, readUrl }) =>
    new MessageEmbed()
      .setTitle(title)
      .setDescription(description)
      .setURL(readUrl)
      .setColor(colors.next())
  );

  discordClient.once("ready", async () => {
    try {
      const channel = discordClient.channels.resolve(
        discordChannel
      ) as TextChannel;

      if (!(channel && channel.type === "text")) {
        throw new Error("Please provide a valid text channel.");
      }

      info(
        `Resolving messages in the channel: ${channel.name} in ${channel.guild.name}`
      );

      const messages = await channel.messages.fetch({
        limit: 100, // Upper limit on number of messages can be fetched in one api call.
      });

      debug(`Found ${messages.size} messages.`);

      const botMessages = messages.filter(
        (message) => message.author.id === discordClient?.user?.id
      );

      debug(`${botMessages.size} messages are from bot.`);

      const messagesRequired = countMessagesRequired(embeds);

      debug(`Number of messages required: ${messagesRequired}`);

      if (messagesRequired > botMessages.size) {
        const pendingMessages = messagesRequired - botMessages.size;
        debug(`Number of messages required to operate: ${pendingMessages}`);

        const newMessagePromises = new Array(pendingMessages)
          .fill(0)
          .map(() => channel.send(new MessageEmbed()));

        const newMessages = await Promise.all(newMessagePromises);
        debug(`${newMessages.length} messages sent.`);

        for (const newMessage of newMessages) {
          botMessages.set(newMessage.id, newMessage);
        }
      } else if (botMessages.size > messagesRequired) {
        const messagesToDestroy = botMessages.last(
          botMessages.size - messagesRequired
        );

        debug(`Destroying last ${messagesToDestroy.length} messages.`);
        const messagesToDeletePromises = new Array(messagesToDestroy.length)
          .fill(0)
          .map((_, index) => channel.messages.delete(messagesToDestroy[index]));
        await Promise.all(messagesToDeletePromises);

        for (const messageToDestroy of messagesToDestroy) {
          botMessages.delete(messageToDestroy.id);
        }

        debug(`Destroyed last ${messagesToDestroy.length} messages.`);
      }

      const messagesArray = botMessages.sorted().array();
      const messagesResetPromises = messagesArray.map((m) =>
        m.edit("", new MessageEmbed())
      );

      await Promise.all(messagesResetPromises);

      const embedPaths = messagesArray
        .slice(0, embeds.length)
        .map((message, index) => {
          const link = `https://discord.com/channels/${channel.guild.id}/${channel.id}/${message.id}`;
          const item = items[index];
          return {
            link,
            ...item,
          } as const;
        });

      const embedPathIndices = embedPaths.reduce<string[][]>(
        (pathIndices, item, index) => {
          const entry = `${index + 1}. [${item.title}](${item.link})`;
          const lastElement = last(pathIndices);
          if (Array.isArray(lastElement)) {
            if (lastElement.length >= MAX_INDICES_IN_AN_EMBED) {
              pathIndices.push([entry]);
            } else {
              lastElement.push(entry);
            }
          }
          return pathIndices;
        },
        [[]]
      );

      const indexEmbeds = embedPathIndices.map((items, index) => {
        const indexEmbed = new MessageEmbed();
        let inputs = items;
        if (!index) {
          indexEmbed.setTitle("Discord FAQ");
          inputs = [
            "Here are several common questions asked in the server. Click on the link to go to the answer.\n",
            ...items,
          ];
        }
        return indexEmbed
          .setDescription(inputs.join("\n"))
          .setColor(colors.next());
      });

      const all = [...embeds, ...indexEmbeds];
      const allMessagesEditPromises = all.map((embed, index) =>
        messagesArray[index].edit(embed)
      );

      await Promise.all(allMessagesEditPromises);

      const lastMessage = messagesArray[messagesArray.length - 1];

      await lastMessage.edit(
        `You can find our FAQs on the website here: ${websiteBaseUrl}`,
        {
          embed: null,
        }
      );
    } catch (e) {
      discordClient.destroy();
      error(e);
      process.exit(0);
    }

    discordClient.destroy();

    info(`Logging out...`);
  });

  discordClient.login(discordToken);
}

run().catch((err) => {
  error(err);
  process.exit(1);
});
