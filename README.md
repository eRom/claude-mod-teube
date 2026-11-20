# teube

![](cover.png)

Le pendant d'`ultrathink` pour Claude Code. Tape **ultrateube** dans ton message et ce tour-là, et lui seul, tourne en effort `low`. Le message suivant reprend ton effort habituel.

Pensé pour les questions simples au milieu d'une session lourde : tu tournes en `xhigh`, Claude vient de te livrer un pavé, et tu veux juste qu'il le reformule sans brûler des tokens de réflexion.

## Installation

Dans une session Claude Code, au terminal :

```
/plugin install teube --marketplace eRom/claude-mod-teube
```

Réponds `y` pour ajouter la marketplace, puis choisis la portée (user par défaut). Le mod est actif tout de suite.

Depuis un shell :

```
claude plugin install teube --marketplace eRom/claude-mod-teube
```

Dans l'app desktop, où `/plugin` ne marche pas : bouton + à côté de la zone de saisie, puis Plugins, Add marketplace avec `eRom/claude-mod-teube`, puis Add plugin.

## Ce que fait le mod

- **Effort low pour un tour.** Chaque requête au modèle de ce tour part en `low`. Le tour suivant n'est pas touché.
- **Toute casse.** `ultrateube`, `ULTRATEUBE`, `UlTrAtEuBé` : tout marche. Le mot doit être entier, `superultrateube2000` ne déclenche rien.
- **Arc-en-ciel.** Le mot-clé se colore lettre par lettre dans la zone de saisie, comme `ultrathink`.
- **Claude est prévenu.** Une courte note lui dit que le tour est en `low` et qu'il doit répondre simplement.
- **Ligne de statut.** `teubé · effort low` s'affiche pendant le tour.
- **Subagents épargnés.** Un subagent lancé pendant ce tour garde son propre effort.

## Prérequis

Une version de Claude Code qui charge les mods (modules de hooks), et un modèle qui accepte le paramètre d'effort.

## Tests

```
claude plugin test .
```

## Licence

MIT
