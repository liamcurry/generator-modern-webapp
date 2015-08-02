'use strict';
var path = require('path')
var yeoman = require('yeoman-generator')
var chalk = require('chalk')
var yosay = require('yosay')
var npmName = require('npm-name')

module.exports = yeoman.generators.Base.extend({
	initializing: function () {
		this.pkg = require('../package.json')

		var config = require('git-config').sync()
		this.email = config.user.email
		this.realname = config.user.name
		this.githubUser = config.github.user
		this.githubUrl = "https://github.com/" + this.githubUser
	},

	prompting: {
		askForName: function () {
			this.log(yosay('Create your own ' + chalk.red('Yeoman') + ' webapp with superpowers!'))
			var done = this.async()
			var appname = this.appname

			var prompts = [{
				name: 'askName',
				message: 'What\'s the base name of your webapp?',
				default: appname
			}, {
				type: 'confirm',
				name: 'askNameAgain',
				message: 'The name above already exists on npm, choose another?',
				default: true,
				when: function (answers) {
					var done = this.async()
					npmName(answers.askName, function (err, available) {
						done(!available)
					})
				}
			}]

			this.prompt(prompts, function (props) {
				if (props.askNameAgain) {
					return this.prompting.askForName.call(this)
				}
				this.appname = props.askName
				var parts = this.destinationRoot().split(path.sep)
				var last = parts[parts.length - 1]
				if (this.appname !== last) {
					this.destinationRoot(this.appname)
				}
				this.config.save()

				done()
			}.bind(this))
		}
	},

	configuring: {
		enforceFolderName: function () {
		}
	},

	writing: {
		app: function () {
			this.template('_package.json', 'package.json')
			this.template('_bower.json', 'bower.json')
			this.template('_gulpfile.js', 'gulpfile.js')
			this.template('_config.js', 'config.js')
			this.template('_README.md', 'README.md')
			this.template('_gulpfile.js', 'gulpfile.js')
			this.template('_travis.yml', '.travis.yml')
		},

		codestyle: function () {
			this.copy('editorconfig', '.editorconfig')
			this.copy('jshintrc', '.jshintrc')
			this.copy('jscsrc', '.jscsrc')
			this.copy('jsfmtrc', '.jsfmtrc')
		},

		git: function () {
			this.copy('gitignore', '.gitignore')
			this.copy('gitattributes', '.gitattributes')
		},

		src: function () {
			this.directory('src', 'src')
		}
	},

	install: function () {
		this.installDependencies({
			skipInstall: this.options['skip-install']
		})
	}
})
