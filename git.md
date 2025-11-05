git init                 → Create a new Git repository in the current directory.
git clone [url]          → Copy an existing repository (usually from GitHub or another remote).
git status               → Show the current state of the working directory and staging area.
git add [file]           → Stage specific files for the next commit.
git add .                → Stage all modified and new files in the directory.
git commit -m "message"  → Save staged changes with a descriptive message.
git diff                 → Show changes between working files, staging area, or commits.
git log                  → View the commit history.
git branch               → List, create, or delete branches.
git branch [name]        → Create a new branch.
git checkout [name]      → Switch to another branch or restore files.
git merge [branch]       → Combine another branch into the current one.
git pull                 → Fetch and merge changes from a remote repository.
git fetch                → Download objects and refs from another repository (no merge).
git push                 → Upload local commits to a remote repository.
git remote -v            → Show linked remote repositories.
git reset [file]         → Unstage a file (keep changes in working directory).
git reset --hard [hash]  → Reset the repository to a specific commit, discarding changes.
git rm [file]            → Remove a file from the working directory and stage the removal.
git stash                → Temporarily save uncommitted changes.
git stash pop            → Reapply stashed changes.
git tag [name]           → Create a tag for a specific commit (often for releases).
git show [hash]          → Show details about a commit or tag.
git rebase [branch]      → Reapply commits on top of another base branch.
git revert [hash]        → Create a new commit that undoes a previous one.
git config --list        → View Git configuration settings.
git blame [file]         → Show who last modified each line of a file.
git clean -fd            → Remove untracked files and directories.
