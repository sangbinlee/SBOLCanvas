import { Component } from '@angular/core'
import { GraphService } from '../graph.service'


@Component({
    selector: 'app-problems',
    templateUrl: './problems.component.html',
    styleUrls: ['./problems.component.css']
})

export class ProblemsComponent {

    warnings: string[]
    errors: string[]

    constructor(private graphService: GraphService) { }

    ngOnInit() {
        this.warnings = []
        this.errors = []

        setInterval(this.validate.bind(this), 750)
    }

    validate() {
        const warnings = []
        const errors = []

        // Validation functions
        this.validateCurrentView(warnings, errors)
        this.validateComponents(warnings, errors)
        // more here...

        // Transpose to separate errors and warnings
        this.warnings = warnings
        this.errors = errors
    }

    validateCurrentView(warnings: string[], errors: string[]) {

        const currentView = this.graphService.getCurrentRoot()
        const children = currentView.children || []

        // Warning: No children in current view
        if (!children.length) {
            const cellType = currentView.isModuleView() ? 'Module' : currentView.isComponentView() ? 'Component' : 'Current view'
            warnings.push(`${cellType} does not contain any children.`)
        }

        // TO DO: other validations
    }

    validateComponents(warnings: string[], errors: string[]) {
        const currentView = this.graphService.getCurrentRoot()
        const circuitContainers = currentView.children || []
        const components = circuitContainers
            .map(container => container.children || [])
            .flat()
            .filter(comp => comp.value)

        components.forEach(comp => this.validateComponent(comp, warnings, errors))
    }

    validateComponent(component, warnings: string[], errors: string[]) {
        const info = this.graphService.lookupInfo(component.value)
        const sequence = (info.sequence || '').toUpperCase()
        const version = (info.version || '')

        // Error: No ID
        !info.displayID && errors.push(`${info.partRole} is missing an ID.`)

        // Error: Non-IUPAC compliant sequence
        const negativeIUPACSequenceRegex = /[^ACGTURYSWKMBDHVN\.\-]/g
        var compliant = !sequence.match(negativeIUPACSequenceRegex)
        const sequencePreview = sequence.substring(0, 10)
        !compliant && errors.push(`Component '${info.displayID}' has illegal sequence: ${sequencePreview}...`)

        // Warning: No sequence
        !sequence && warnings.push(`Component '${info.displayID}' does not have a sequence.`)

        // Warning: No version
        !version && warnings.push(`Component '${info.displayID}' does not have a version.`)

        // Warning: Non-Semver compliant version
        // Got Regex from https://ihateregex.io/expr/semver/#
        // const semverVersionRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/gm

        // using less strict expression now -- SBOL interpreted Semver improperly and actually intended
        // to allow versions like 1 or 1.3
        const versionRegex = /^[0-9]+[\\p{L}0-9_\\.-]*$/
        compliant = !!version.match(versionRegex)
        version && !compliant &&
            warnings.push(`Component '${info.displayID}' has incompliant version: ${version}`)
    }
}
