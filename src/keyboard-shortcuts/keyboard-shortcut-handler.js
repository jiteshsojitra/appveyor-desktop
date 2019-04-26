/*
	A sequence of key presses is considered a sequence as long as:
	1. Some key that can start a sequence has been pressed
	2. Only keys that are valid in the sequence chain have been pressed
	3. Until a users presses a key that completes a sequence or is not valid in any sequence chain
	4. The sequence delay timer expires (default of 2s but can be overriden)

	If a user presses a key while in a sequence that is not part of any valid sequence chain,
	the sequence is ended and that key is not processed individually outside of the sequence
*/

const DEFAULT_SEQUENCE_DELAY = 1000;

/**
 *
 * @param {Object} options Named arguments to instantiate the class
 * @param {number} [options.sequenceDelay==1000] Max delay between keystrokes to consider it a sequence
 * @param {Object} store Redux store
 * @param {KeyToCommandBindings} keyBindings
 */
export default function KeyboardShortcutHandler(options) {
	const sequenceDelay = options.sequenceDelay || DEFAULT_SEQUENCE_DELAY;
	const keyBindings = options.keyBindings;

	const handlers = {};

	const getContextCommandKey = (context, command) => `${context}::${command}`;

	/**
	 * Add an array of command handler definitions
	 *
	 * @param {Object[]} commandHandlers
	 * @param {string} commandHandlers[].context context where the handler is applicable, e.g. 'all', 'mail', 'compose', etc.
	 * @param {string} commandHandlers[].command  command that the handler is applicable for
	 * @param {function} commandHandlers[].handler handler function
	 */
	const addCommandHandlers = commandHandlers => {
		commandHandlers.forEach(({ context, command, handler }) => {
			const key = getContextCommandKey(context, command);
			(handlers[key] || (handlers[key] = [])).push(handler);
		});
	};

	/**
	 * Remove an array of command handler definitions.  If multiple matching definitions are found, only the most recently registered one is removed
	 *
	 * @param {Object[]} commandHandlers
	 * @param {string} commandHandlers[].context context where the handler is applicable, e.g. 'all', 'mail', 'compose', etc.
	 * @param {string} commandHandlers[].command  command that the handler is applicable for
	 * @param {function} commandHandlers[].handler handler function
	 */
	const removeCommandHandlers = commandHandlers => {
		commandHandlers.forEach(({ context, command, handler }) => {
			const key = getContextCommandKey(context, command);
			const list = handlers[key];
			if (list) {
				for (let i = list.length; i--; ) {
					if (list[i] === handler) {
						list.splice(i, 1);
						break;
					}
				}
			}
		});
	};

	/**
	 * Get all registered handlers for a context/command pair
	 *
	 * @param {Object} arg
	 * @param {string} arg.context
	 * @param {string} arg.command
	 *
	 * @returns {function[]} Array of handler functions
	 */
	const getCommandHandlers = ({ context, command }) =>
		handlers[getContextCommandKey(context, command)] || [];

	/**
	 * Process all possible context/command, but only proces the 'all' context if no other contexts handled a command
	 *
	 * @param {Object[]} commands array of command/context pairs
	 * @param {string} commands[].context
	 * @param {string} commands[].command
	 * @param {Event} e The keydown event
	 *
	 * @returns {bool} true if any command was handled, false if no commands were handled
	 */
	const processCommands = (commands, e) => {
		if (!(commands && commands.length)) return false;

		let handled = false,
			allContextCommand;

		//process all contexts except for "all"
		commands.forEach(cc => {
			if (cc.context === 'all') return (allContextCommand = cc);
			getCommandHandlers(cc).forEach(handler => {
				handled = true;
				handler({ e, ...cc });
			});
		});

		//if it hasn't been handled yet, try the all context
		!handled &&
			allContextCommand &&
			getCommandHandlers(allContextCommand).forEach(handler => {
				handled = true;
				handler({ e, ...allContextCommand });
			});

		return handled;
	};

	let sequence, sequenceTimer;

	const terminateSequence = commands => {
		clearTimeout(sequenceTimer);
		sequence = sequenceTimer = undefined;

		processCommands(commands);
	};

	/**
	 * Handle the keydown event
	 *
	 * @param {object} argument
	 * @param {Event} argument.e The keydown event
	 */
	const handleKeyDown = ({ e }) => {
		const { target } = e;
		//ignore if the target is a place where you can type or if it is a hot key
		if (
			(target.nodeName.match(/INPUT|TEXTAREA|SELECT|OPTION/) && !e.disabled) ||
			target.isContentEditable ||
			e.key.match(/Control|Alt|Shift|Meta/)
		)
			return;

		//generate a deterministic key based on what hotkeys are also pressed along with a given key
		//cmd,ctrl,shift,alt in that order
		let key = [
			e.metaKey && 'cmd',
			e.ctrlKey && 'ctrl',
			e.shiftKey && 'shift',
			e.altKey && 'alt',
			e.key.toUpperCase()
		]
			.filter(Boolean)
			.join('+');

		//if we are in a sequence, continue creating the dot-notated key for the sequence lookup
		if (sequence) key = sequence += '.' + key;

		//search for the command in the local context first and then the global context
		const { commands, sequences } = keyBindings.getCommandsAndSequences(key);

		//If we got some actual commands (i.e. not just sequences), or we got 0 matches for commands or sequenes, then terminate any running sequences and execute our commands
		if (commands.length || !sequences.length) {
			if (sequence) terminateSequence();
			if (processCommands(commands, e)) return;
		}

		//this is starting/continuing a sequence - reset our timer and create new sequence key if necessary
		if (!sequence) sequence = key;
		clearTimeout(sequenceTimer);
		//The sequence might have a default command to run if no other keys are pressed before the timer runs out
		sequenceTimer = setTimeout(() => terminateSequence(sequences), sequenceDelay);
	};

	/**
	 * Return all shortcuts that actually have a handler presently
	 *
	 * @returns {Object[]} Of form [{context, [{shortcut, command},...]}, ...]
	 */
	const getShortcuts = () => {
		const bindings = keyBindings.getBindings();
		return Object.keys(bindings).reduce((result, context) => {
			const shortcutsForContext = flatten(bindings[context], context);
			if (shortcutsForContext && shortcutsForContext.length) result[context] = shortcutsForContext;
			return result;
		}, {});
	};

	const flatten = (root, context, compoundKey) => {
		if (typeof root !== 'object') {
			compoundKey = compoundKey.replace(/ default$/, '');
			//return false if no handlers for the command registered at this key
			return getCommandHandlers({ context, command: root }).length && [[compoundKey, root]];
		}
		return Object.keys(root).reduce((result, key) => {
			const subResult = flatten(root[key], context, compoundKey ? `${compoundKey} ${key}` : key);
			return subResult ? result.concat(subResult) : result;
		}, []);
	};

	return {
		addCommandHandlers,
		removeCommandHandlers,
		handleKeyDown,
		getShortcuts
	};
}
