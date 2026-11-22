(function (GW) {
  'use strict';

  GW.text = {
    daily: {
      header: 'DAILY HEIST',
      seed: 'SEED',
      streak: 'STREAK'
    },
    leaderboard: {
      title: 'LOCAL LEADERBOARD'
    },
    audio: {
      enable: 'CLICK TO ENABLE AUDIO',
      unavailable: 'AUDIO UNAVAILABLE'
    },
    effects: {
      lineCut: 'TRACE COMPLETE: LINE CUT',
      rankStamp: 'RANK {{rank}}'
    },
    levels: {
      L0: {
        title: 'BOOT CAMP',
        brief: 'Learn the shell basics: read the boot log, scan its service, then connect to the open port.',
        story: {
          intro: 'VESPER: Easy first. Read the boot log, scan the service it names, then connect to the open port.',
          complete: 'VESPER: Clean entry. Keep those shell basics close; the next door listens.'
        },
        bootLog: 'BOOT LOG // service={{service}}',
        scan: 'SCAN // {{service}} // open port {{port}}',
        connected: 'SESSION ESTABLISHED // BOOT CAMP COMPLETE',
        wrong: 'COMMAND REJECTED // Check the boot log and follow its sequence.',
        hintsSpent: 'NO HINTS REMAINING // Use the clues already collected.',
        hints: [
          'Use cat boot.log to find the service name.',
          'Scan the exact service printed in boot.log.',
          'Connect to the port returned by scan.'
        ]
      },
      L1: {
        title: 'KNOCKKNOCK',
        brief: 'Read the door log, then knock in the recorded slot order.',
        story: {
          intro: 'VESPER: This lock remembers a rhythm. Read its log, then knock the colors in slot order.',
          complete: 'VESPER: Door opened. Someone left that pattern for us.'
        },
        doorLog: 'DOOR LOG // slot 1={{one}} // slot 2={{two}} // slot 3={{three}}',
        opened: 'ACCESS GRANTED // KNOCKKNOCK COMPLETE',
        wrong: 'ACCESS DENIED // The door stays quiet. Check the slot order.',
        hintsSpent: 'NO HINTS REMAINING // Use the clues already collected.',
        hints: [
          'Use cat door.log to inspect the recorded slots.',
          'The slot numbers define the order; do not sort the colors.',
          'Use knock followed by the three colors, in order.'
        ]
      },
      L2: {
        title: 'CRACKLINE',
        brief: 'Use the keyring checksum to identify the only matching access code.',
        story: {
          intro: 'VESPER: The keyring was scrambled, not erased. Find the code whose digits match the checksum.',
          complete: 'VESPER: Checksum accepted. The next layer is a different kind of lock.'
        },
        keyring: 'KEYRING // candidates={{codes}} // digit checksum={{checksum}}',
        opened: 'KEY ACCEPTED // CRACKLINE COMPLETE',
        wrong: 'KEY REJECTED // That code does not match the keyring checksum.',
        hintsSpent: 'NO HINTS REMAINING // Use the clues already collected.',
        hints: [
          'Use cat crackline/keyring.log to reveal the candidates and checksum.',
          'Add the digits of each candidate; only one total matches.',
          'Submit the matching candidate with crack <code>.'
        ]
      },
      L3: {
        title: 'CIPHERWORKS',
        brief: 'Read the cipher note, decode its text, then verify the plaintext.',
        story: {
          intro: 'VESPER: CipherWorks left a clean Caesar shift. Read the note, decode the text, then verify the word.',
          complete: 'VESPER: Cipherworks is open. The vault is no longer a rumor.'
        },
        cipherNote: 'CIPHER NOTE // {{cipher}} // rotate backward {{shift}} letters',
        decoded: 'DECODED TEXT // {{plain}}',
        opened: 'CIPHER VERIFIED // CIPHERWORKS COMPLETE',
        wrong: 'CIPHER REJECTED // Read the note and verify the decoded word.',
        hintsSpent: 'NO HINTS REMAINING // Use the clues already collected.',
        hints: [
          'Use cat cipher.note to read the shift direction and ciphertext.',
          'Use decode <ciphertext>; rotate each letter backward by the stated shift.',
          'Use verify <word> with the decoded plaintext.'
        ]
      },
      L4: {
        title: 'LOGHOUND',
        brief: 'Find the only node with both a denied and a granted authentication in auth.log.',
        story: {
          intro: 'VESPER: The audit trail is noisy. Find the one node that failed authentication and then got through.',
          complete: 'VESPER: There. That is the hand that opened the inner route.'
        },
        logHeading: 'AUTH LOG // search for a node with both results',
        logLine: '{{node}} // authentication={{result}}',
        completeText: 'NODE ISOLATED // LOGHOUND COMPLETE',
        wrong: 'TRACE TARGET REJECTED // Compare every node in the log.',
        hintsSpent: 'NO HINTS REMAINING // Recheck the authentication results.',
        hints: [
          'Use cat auth.log to inspect every authentication result.',
          'One node appears with both DENIED and GRANTED results.',
          'Use trace followed by that node name.'
        ],
        nodes: ['relay-amber', 'relay-cyan', 'relay-slate', 'relay-violet'],
        deniedLabel: 'DENIED',
        grantedLabel: 'GRANTED'
      },
      L5: {
        title: 'GRAPH RUNNER',
        brief: 'Read graph.map and route from ENTRY to CORE without crossing ICE.',
        story: {
          intro: 'VESPER: The map is live. Find the only route to CORE that avoids the ICE node.',
          complete: 'VESPER: Route is clean. Vault-9 is the last door.'
        },
        mapHeading: 'GRAPH MAP // SAFE edges avoid ICE',
        edgeLine: '{{from}} -> {{to}} // {{risk}}',
        completeText: 'SAFE ROUTE CONFIRMED // GRAPHRUNNER COMPLETE',
        wrong: 'ROUTE REJECTED // Check the graph and avoid the ICE node.',
        hintsSpent: 'NO HINTS REMAINING // Trace the edges from ENTRY to CORE.',
        hints: [
          'Use cat graph.map to list every directed edge.',
          'The route must begin at ENTRY and end at CORE.',
          'Avoid the ICE node; enter the remaining route nodes in order.'
        ],
        nodes: ['ENTRY', 'NODE-1', 'NODE-2', 'NODE-3', 'ICE', 'CORE'],
        safeLabel: 'SAFE',
        iceLabel: 'ICE'
      },
      L6: {
        title: 'VAULT-9',
        brief: 'Clear three vault phases: synchronize the signal, route around ICE, then authorize the ledger key.',
        story: {
          intro: 'VESPER: Vault-9 has three live layers. Clear each one; then decide what happens to the ledger.',
          phase2: 'VESPER: Signal accepted. The ICE route is live; do not take the marked node.',
          phase3: 'VESPER: Route is clean. One key remains between us and the ledger.',
          choice: 'VESPER: The ledger can disappear with us, or leave this vault in the open. Choose.'
        },
        phase: 'VAULT PHASE {{phase}} // {{name}}',
        phaseNames: ['SIGNAL HANDSHAKE', 'ICE ROUTE', 'LEDGER KEY'],
        signalLog: 'SIGNAL // slot 1={{one}} // slot 2={{two}} // slot 3={{three}}',
        mapHeading: 'ICE MAP // SAFE edges avoid ICE',
        edgeLine: '{{from}} -> {{to}} // {{risk}}',
        safeLabel: 'SAFE',
        iceLabel: 'ICE',
        keyring: 'LEDGER KEYRING // candidates={{codes}} // digit checksum={{checksum}}',
        phaseClear: 'PHASE {{phase}} CLEARED',
        completeText: 'VAULT-9 OPEN // LEDGER ACCESS GRANTED',
        endingHeader: 'ENDING SELECTED // {{ending}}',
        wrong: 'VAULT LOCKDOWN // Recheck the current phase intel.',
        hintsSpent: 'NO HINTS REMAINING // Use the intel collected for this phase.',
        hints: [
          'Read vault.plan for the current phase, then enter its signal sequence.',
          'The ICE map has one route from ENTRY to CORE that avoids ICE.',
          'Choose the key whose digits sum to the checksum, then authorize it.'
        ],
        signals: ['amber', 'cyan', 'violet', 'white'],
        nodes: ['ENTRY', 'NODE-A', 'NODE-B', 'NODE-C', 'ICE', 'CORE'],
        storyChoices: {
          ghost: 'ENDING A // GHOST',
          whistle: 'ENDING B // WHISTLE'
        },
        endings: {
          ghost: 'ENDING A // The ledger is erased. VESPER vanishes into the dark; no one can sell the names again.',
          whistle: 'ENDING B // The ledger reaches the public record. VESPER stays to answer for the lies and the lives they saved.'
        },
        dailyComplete: 'DAILY HEIST COMPLETE // SEED {{seed}} // ENDING {{ending}}'
      }
    }
  };
})(window.GW);
