require('dotenv').config()
const commandLineArgs = require('command-line-args')
const fs = require('fs-extra')
const { DateTime, Interval } = require('luxon')
const sources = require('./src/sources')
const runner = require('./src/run')
const bigQueryRunner = require('./src/run/bigquery')
const writer = require('./src/output/files')
const config = require('./config')
const bigquery = require('./src/run/bigquery')
const reporter = require('./src/utilities/reporter')()
const startTime = DateTime.local()

const optionDefinitions = [
  { name: 'source', alias: 's', type: String },
  { name: 'clean', alias: 'c', type: Boolean },
  { name: 'bigquery', alias: 'b', type: Boolean },
  { name: 'volunteers', alias: 'v', type: Boolean },
]

const options = commandLineArgs(optionDefinitions)

if (options.clean) {
  fs.removeSync(config.outputPath)
}
fs.ensureDirSync(config.outputPath)

const run = () => {
  if (!options.volunteers) {
    bigQueryRunner(config, (result) => {
      reporter.addDataLine('BigQuery tables written', result.length)
    })
  }
  if (options.bigquery) {
    return
  }
  runner(
    sources(options),
    (result) => {
      writer(result, config.outputPath)
    },
    (api, graphQl) => {
      if (!options.volunteers) {
        fs.writeJsonSync(
          `${config.outputPath}openapi.json`,
          api.getDefinition(),
          {
            spaces: 2,
          }
        )
        fs.writeFileSync(`${config.outputPath}schema.graphql`, graphQl.getSdl())
      }
      reporter.addDataLine('Files written', reporter.getTotal('files'))
      const buildTime = Interval.fromDateTimes(startTime, DateTime.local())
      reporter.addLine(
        `Total run time: ${
          buildTime.length('minutes') > 1
            ? Math.floor(buildTime.length('seconds') / 60)
            : 0
        } minutes ${Math.round(buildTime.length('seconds') % 60)} seconds`
      )
      reporter.report()
    }
  )
}

run()
