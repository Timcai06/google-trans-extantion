#!/usr/bin/env node

/**
 * Small syntax-level boundary guard for packages/core/src.
 * This is not a type-aware proof of semantic isolation: it checks imports and
 * direct runtime-global syntax, not aliases, reflection, or generated code.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const RUNTIME_GLOBALS = new Set([
  'chrome',
  'window',
  'document',
  'navigator',
  'localStorage',
  'indexedDB',
  'self',
  'fetch',
]);

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs'];

/** @typedef {{ fileName: string, text: string }} BoundarySource */
/** @typedef {{ file: string, line: number, column: number, rule: string, message: string }} BoundaryViolation */

/**
 * Check the transitive source closure rooted at a core source directory.
 * For tests, `sources` can provide an in-memory fixture tree.
 *
 * @param {{ coreRoot: string, sources?: readonly BoundarySource[] }} options
 * @returns {BoundaryViolation[]}
 */
export function checkCoreBoundaries({ coreRoot, sources }) {
  const root = path.resolve(coreRoot);
  const sourceMap = new Map();

  for (const source of sources ?? []) {
    sourceMap.set(path.resolve(source.fileName), source.text);
  }

  if (!sources) {
    for (const fileName of listSourceFiles(root)) {
      sourceMap.set(fileName, fs.readFileSync(fileName, 'utf8'));
    }
  }

  const violations = [];
  if (sourceMap.size === 0) {
    violations.push({
      file: '.',
      line: 1,
      column: 1,
      rule: 'core-source',
      message: `No source files found under ${root}.`,
    });
  }
  const visited = new Set();
  const pending = [...sourceMap.keys()].filter((fileName) => isInside(root, fileName));

  while (pending.length > 0) {
    const fileName = pending.pop();
    if (visited.has(fileName)) continue;
    visited.add(fileName);

    const sourceText = sourceMap.get(fileName) ?? readSource(fileName);
    if (sourceText === undefined) continue;

    const sourceFile = ts.createSourceFile(
      fileName,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(fileName),
    );

    const report = (node, rule, message) => {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      violations.push({
        file: path.relative(root, fileName).split(path.sep).join('/'),
        line: line + 1,
        column: character + 1,
        rule,
        message,
      });
    };

    const inspectModuleSpecifier = (node) => {
      if (!node || !ts.isStringLiteralLike(node)) return;
      const specifier = node.text;
      if (!specifier.startsWith('.')) {
        report(node, 'core-import', `Core source cannot import external module "${specifier}".`);
        return;
      }

      const requestedPath = path.resolve(path.dirname(fileName), specifier);
      if (!isInside(root, requestedPath)) {
        report(node, 'core-import', `Relative import "${specifier}" escapes packages/core/src.`);
        return;
      }
      const resolved = resolveRelativeImport(fileName, specifier, sourceMap);
      if (!resolved) {
        report(
          node,
          'core-import',
          `Relative import "${specifier}" cannot be resolved inside the core source tree.`,
        );
        return;
      }
      if (!sourceMap.has(resolved)) {
        const importedText = readSource(resolved);
        if (importedText !== undefined) sourceMap.set(resolved, importedText);
      }
      if (sourceMap.has(resolved) && !visited.has(resolved)) pending.push(resolved);
    };

    const visit = (node) => {
      inspectGlobalThisDestructure(node, sourceFile, report);

      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        inspectModuleSpecifier(node.moduleSpecifier);
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)
      ) {
        inspectModuleSpecifier(node.moduleReference.expression);
      } else if (ts.isImportTypeNode(node)) {
        const argument = node.argument;
        if (ts.isLiteralTypeNode(argument)) inspectModuleSpecifier(argument.literal);
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword || isRequireCall(node.expression))
      ) {
        const specifier = node.arguments[0];
        if (specifier && ts.isStringLiteralLike(specifier)) inspectModuleSpecifier(specifier);
        else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          report(
            node,
            'core-import',
            'Dynamic import in core must use a literal relative path inside the core source tree.',
          );
        }
      }

      inspectRuntimeGlobal(node, sourceFile, report);
      visitChildren(node, visit);
    };

    visit(sourceFile);
  }

  return deduplicateAndSort(violations);
}

/**
 * @param {string} directory
 * @returns {string[]}
 */
function listSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(fullPath));
    else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name)))
      files.push(path.resolve(fullPath));
  }
  return files;
}

function scriptKindFor(fileName) {
  return /\.tsx$/i.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function resolveRelativeImport(fromFile, specifier, sourceMap) {
  const rawTarget = path.resolve(path.dirname(fromFile), specifier);
  const ext = path.extname(rawTarget);
  const candidates = [];
  if (ext) {
    candidates.push(rawTarget);
    if (ext === '.js')
      candidates.push(`${rawTarget.slice(0, -3)}.ts`, `${rawTarget.slice(0, -3)}.tsx`);
    if (ext === '.mjs') candidates.push(`${rawTarget.slice(0, -4)}.mts`);
    if (ext === '.cjs') candidates.push(`${rawTarget.slice(0, -4)}.cts`);
  } else {
    for (const extension of SOURCE_EXTENSIONS) candidates.push(`${rawTarget}${extension}`);
    for (const extension of SOURCE_EXTENSIONS)
      candidates.push(path.join(rawTarget, `index${extension}`));
  }
  return candidates.find((candidate) => sourceMap.has(candidate) || fs.existsSync(candidate));
}

function readSource(fileName) {
  try {
    return fs.readFileSync(fileName, 'utf8');
  } catch {
    return undefined;
  }
}

function isInside(root, candidate) {
  const relative = path.relative(root, path.resolve(candidate));
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

function isRequireCall(expression) {
  return ts.isIdentifier(expression) && expression.text === 'require';
}

function visitChildren(node, visit) {
  ts.forEachChild(node, visit);
}

function inspectRuntimeGlobal(node, sourceFile, report) {
  if (!ts.isIdentifier(node)) return;

  if (node.text === 'globalThis' && isGlobalThisForbiddenAccess(node)) {
    const target = getGlobalThisPropertyName(node);
    report(node, 'runtime-global', `Core cannot access globalThis.${target}.`);
    return;
  }

  if (RUNTIME_GLOBALS.has(node.text) && isValueReference(node)) {
    report(node, 'runtime-global', `Core cannot reference browser runtime global "${node.text}".`);
    return;
  }

  if (node.text === 'Date' && isNondeterministicDateUse(node)) {
    report(
      node,
      'clock',
      'Core must receive time as input; use an injected timestamp instead of Date.now() or an argument-free Date constructor/call.',
    );
  }
}

function inspectGlobalThisDestructure(node, sourceFile, report) {
  if (!ts.isVariableDeclaration(node) || !node.initializer || !ts.isObjectBindingPattern(node.name))
    return;
  if (!ts.isIdentifier(node.initializer) || node.initializer.text !== 'globalThis') return;

  for (const element of node.name.elements) {
    const propertyName = element.propertyName ?? element.name;
    if (
      (ts.isIdentifier(propertyName) || ts.isStringLiteralLike(propertyName)) &&
      RUNTIME_GLOBALS.has(propertyName.text)
    ) {
      report(propertyName, 'runtime-global', `Core cannot access globalThis.${propertyName.text}.`);
    }
  }
}

function isGlobalThisForbiddenAccess(identifier) {
  const parent = identifier.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.expression === identifier) {
    return RUNTIME_GLOBALS.has(parent.name.text);
  }
  if (ts.isElementAccessExpression(parent) && parent.expression === identifier) {
    const argument = parent.argumentExpression;
    return argument && ts.isStringLiteralLike(argument) && RUNTIME_GLOBALS.has(argument.text);
  }
  return false;
}

function getGlobalThisPropertyName(identifier) {
  const parent = identifier.parent;
  if (ts.isPropertyAccessExpression(parent)) return parent.name.text;
  if (
    ts.isElementAccessExpression(parent) &&
    parent.argumentExpression &&
    ts.isStringLiteralLike(parent.argumentExpression)
  ) {
    return parent.argumentExpression.text;
  }
  return 'runtime value';
}

function isValueReference(identifier) {
  const parent = identifier.parent;

  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) return false;
  if (ts.isQualifiedName(parent) && parent.right === identifier) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === identifier) return false;
  if (ts.isMethodDeclaration(parent) && parent.name === identifier) return false;
  if (ts.isMethodSignature(parent) && parent.name === identifier) return false;
  if (ts.isPropertyDeclaration(parent) && parent.name === identifier) return false;
  if (ts.isPropertySignature(parent) && parent.name === identifier) return false;
  if (ts.isFunctionDeclaration(parent) && parent.name === identifier) return false;
  if (ts.isClassDeclaration(parent) && parent.name === identifier) return false;
  if (ts.isVariableDeclaration(parent) && parent.name === identifier) return false;
  if (ts.isParameter(parent) && parent.name === identifier) return false;
  if (
    ts.isBindingElement(parent) &&
    (parent.name === identifier || parent.propertyName === identifier)
  )
    return false;
  if (
    ts.isImportClause(parent) ||
    ts.isImportSpecifier(parent) ||
    ts.isNamespaceImport(parent) ||
    ts.isImportEqualsDeclaration(parent)
  )
    return false;
  if (ts.isTypeAliasDeclaration(parent) && parent.name === identifier) return false;
  if (ts.isInterfaceDeclaration(parent) && parent.name === identifier) return false;
  if (ts.isEnumDeclaration(parent) && parent.name === identifier) return false;
  if (ts.isTypeParameterDeclaration(parent) && parent.name === identifier) return false;
  if (
    ts.isLabeledStatement(parent) ||
    ts.isBreakStatement(parent) ||
    ts.isContinueStatement(parent)
  )
    return false;
  if (isTypePosition(identifier)) return false;

  return true;
}

function isTypePosition(identifier) {
  let current = identifier.parent;
  while (current) {
    if (ts.isTypeNode(current)) return true;
    if (ts.isExpression(current) || ts.isStatement(current) || ts.isSourceFile(current))
      return false;
    current = current.parent;
  }
  return false;
}

function isNondeterministicDateUse(identifier) {
  const parent = identifier.parent;
  if (
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === identifier &&
    parent.name.text === 'now'
  ) {
    return ts.isCallExpression(parent.parent) && parent.parent.expression === parent;
  }
  if (ts.isNewExpression(parent) && parent.expression === identifier)
    return !parent.arguments || parent.arguments.length === 0;
  if (ts.isCallExpression(parent) && parent.expression === identifier) return true;
  return false;
}

function deduplicateAndSort(violations) {
  const unique = new Map();
  for (const violation of violations) {
    const key = `${violation.file}:${violation.line}:${violation.column}:${violation.rule}:${violation.message}`;
    unique.set(key, violation);
  }
  return [...unique.values()].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.column - b.column ||
      a.rule.localeCompare(b.rule),
  );
}

function runCli() {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDirectory, '..');
  const coreRoot = path.join(repositoryRoot, 'packages/core/src');
  const violations = checkCoreBoundaries({ coreRoot });

  if (violations.length > 0) {
    for (const violation of violations) {
      const file =
        violation.file === '.' ? 'packages/core/src' : `packages/core/src/${violation.file}`;
      process.stderr.write(
        `${file}:${violation.line}:${violation.column} [${violation.rule}] ${violation.message}\n`,
      );
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Architecture boundary check passed (${listSourceFiles(coreRoot).length} source files).\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
